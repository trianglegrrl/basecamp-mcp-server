import * as fs from 'node:fs';
import * as path from 'node:path';
import { config } from 'dotenv';
import { BasecampClient } from '../lib/basecamp-client.js';
import { tokenStorage } from '../lib/token-storage.js';
import { readAllIdStores, deleteIdStore } from '../lib/live-id-store.js';
import { projectPath } from '../lib/paths.js';

config({ path: projectPath('.env') });

export interface CleanupSummary {
  trashed: number;
  failed: number;
}

/**
 * Trash every captured ID across every .test-live-ids-*.json file in the
 * given directory. Returns a summary; preserves files that had failures
 * (so a retry can pick them up).
 */
export async function runCleanup(
  client: BasecampClient,
  dir: string,
): Promise<CleanupSummary> {
  const summary: CleanupSummary = { trashed: 0, failed: 0 };
  if (!fs.existsSync(dir)) return summary;

  const files = fs.readdirSync(dir).filter((f) =>
    f.startsWith('.test-live-ids-') && f.endsWith('.json'),
  );

  for (const file of files) {
    const runId = file.replace(/^\.test-live-ids-/, '').replace(/\.json$/, '');
    const filePath = path.join(dir, file);
    const entries = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    let allSucceeded = true;
    for (const entry of entries) {
      try {
        await client.setRecordingStatus(entry.project_id, entry.recording_id, 'trashed');
        summary.trashed++;
      } catch {
        summary.failed++;
        allSucceeded = false;
      }
    }
    if (allSucceeded) deleteIdStore(runId, dir);
  }

  return summary;
}

async function main(): Promise<void> {
  const tokenData = await tokenStorage.getToken();
  if (!tokenData?.accessToken) {
    console.error('Cleanup needs an OAuth token. Run `npm run auth` first.');
    process.exit(1);
  }
  const accountId = tokenData.accountId ?? process.env.BASECAMP_ACCOUNT_ID;
  if (!accountId) {
    console.error('BASECAMP_ACCOUNT_ID is unset.');
    process.exit(1);
  }
  const client = new BasecampClient({
    accessToken: tokenData.accessToken,
    accountId,
    userAgent: process.env.USER_AGENT ?? 'Basecamp MCP cleanup',
    authMode: 'oauth',
  });
  const summary = await runCleanup(client, projectPath('.'));
  console.log(`Cleanup complete. Trashed: ${summary.trashed}. Failed: ${summary.failed}.`);
  if (summary.failed > 0) process.exit(2);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
