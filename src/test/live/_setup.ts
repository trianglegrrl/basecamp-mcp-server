import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { BasecampClient } from '../../lib/basecamp-client.js';
import { tokenStorage } from '../../lib/token-storage.js';
import { assertSandbox } from '../../lib/live-sandbox-guard.js';
import { createIdStore, deleteIdStore, type IdStore } from '../../lib/live-id-store.js';
import { auditForLeaks } from '../../lib/live-leak-audit.js';
import { projectPath } from '../../lib/paths.js';
import { dispatch } from '../../tools/index.js';

config({ path: projectPath('.env') });

export interface LiveContext {
  client: BasecampClient;
  projectId: string;
  store: IdStore;
  runId: string;
  prefix: string;
  /**
   * Route a tool call through the actual MCP dispatch layer (zod
   * validation + handler + envelope wrapping), then unwrap the
   * success payload. Throws if dispatch returned an error envelope —
   * the live tests are validating both the BC3 round trip AND that
   * our MCP wiring matches what a real client would see.
   */
  call: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;
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
  const runId = randomUUID();
  const store = createIdStore(runId, projectPath('.'));
  const prefix = `[mcp-test-${runId}]`;

  const call = async (name: string, args: Record<string, unknown>) => {
    const envelope = await dispatch(name, args, client);
    const text = (envelope.content[0] as { text: string }).text;
    const parsed = JSON.parse(text) as Record<string, unknown>;
    if (parsed.status !== 'success') {
      throw new Error(`dispatch(${name}) failed: ${JSON.stringify(parsed)}`);
    }
    return parsed;
  };

  return { client, projectId, store, runId, prefix, call };
}

export async function afterAllLiveTests(ctx: LiveContext): Promise<void> {
  // Defense-in-depth audit. Should report nothing if the lifecycle tests
  // trashed everything they created.
  const leaks = await auditForLeaks(ctx.client, ctx.projectId, ctx.prefix);
  if (leaks.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[live-test leak audit] ${leaks.length} prefixed item(s) still active:`,
      leaks,
      `\nPreserving capture file for retry via \`npm run test:live:cleanup\`.`,
    );
    return;
  }
  // Audit clean — drop the per-run JSON file.
  deleteIdStore(ctx.runId, projectPath('.'));
}
