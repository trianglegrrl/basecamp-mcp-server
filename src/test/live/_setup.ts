import * as path from 'node:path';
import { config } from 'dotenv';
import { BasecampClient } from '../../lib/basecamp-client.js';
import { tokenStorage } from '../../lib/token-storage.js';
import { assertSandbox } from '../../lib/live-sandbox-guard.js';
import { createIdStore, type IdStore } from '../../lib/live-id-store.js';
import { projectPath } from '../../lib/paths.js';

config({ path: projectPath('.env') });

export interface LiveContext {
  client: BasecampClient;
  projectId: string;
  store: IdStore;
  runId: string;
  prefix: string;
}

export async function bootstrapLive(): Promise<LiveContext> {
  const tokenData = await tokenStorage.getToken();
  if (!tokenData?.accessToken) {
    throw new Error('Live tests require an OAuth token; run `npm run auth` first.');
  }
  const accountId = tokenData.accountId ?? process.env.BASECAMP_ACCOUNT_ID;
  if (!accountId) throw new Error('BASECAMP_ACCOUNT_ID is unset.');

  const client = new BasecampClient({
    accessToken: tokenData.accessToken,
    accountId,
    userAgent: process.env.USER_AGENT ?? 'Basecamp MCP Server (live tests)',
    authMode: 'oauth',
  });

  const projectId = await assertSandbox(client);
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const store = createIdStore(runId, projectPath('.'));
  const prefix = `[mcp-test-${runId}]`;

  return { client, projectId, store, runId, prefix };
}
