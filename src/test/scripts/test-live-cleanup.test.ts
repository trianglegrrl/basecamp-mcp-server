import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { runCleanup } from '../../scripts/test-live-cleanup.js';
import type { BasecampClient } from '../../lib/basecamp-client.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-cleanup-'));
});
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function makeMockClient() {
  return { setRecordingStatus: vi.fn().mockResolvedValue(undefined) } as unknown as BasecampClient;
}

describe('runCleanup', () => {
  it('trashes every captured ID across every leftover store file', async () => {
    fs.writeFileSync(path.join(tmpDir, '.test-live-ids-run-a.json'), JSON.stringify([
      { recording_id: '1', type: 'Todo', project_id: '100' },
      { recording_id: '2', type: 'Message', project_id: '100' },
    ]));
    fs.writeFileSync(path.join(tmpDir, '.test-live-ids-run-b.json'), JSON.stringify([
      { recording_id: '3', type: 'Comment', project_id: '100' },
    ]));
    const client = makeMockClient();

    const summary = await runCleanup(client, tmpDir);

    expect(summary.trashed).toBe(3);
    expect(summary.failed).toBe(0);
    expect(client.setRecordingStatus).toHaveBeenCalledTimes(3);
    expect(client.setRecordingStatus).toHaveBeenCalledWith('100', '1', 'trashed');
    expect(client.setRecordingStatus).toHaveBeenCalledWith('100', '2', 'trashed');
    expect(client.setRecordingStatus).toHaveBeenCalledWith('100', '3', 'trashed');
  });

  it('removes id-store files after successful trashing', async () => {
    fs.writeFileSync(path.join(tmpDir, '.test-live-ids-run-x.json'), JSON.stringify([
      { recording_id: '1', type: 'Todo', project_id: '100' },
    ]));
    const client = makeMockClient();
    await runCleanup(client, tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.test-live-ids-run-x.json'))).toBe(false);
  });

  it('counts failures and keeps the file when any trash fails', async () => {
    fs.writeFileSync(path.join(tmpDir, '.test-live-ids-run-y.json'), JSON.stringify([
      { recording_id: '1', type: 'Todo', project_id: '100' },
      { recording_id: '2', type: 'Todo', project_id: '100' },
    ]));
    const client = {
      setRecordingStatus: vi.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('BC3 hiccup')),
    } as unknown as BasecampClient;

    const summary = await runCleanup(client, tmpDir);
    expect(summary.trashed).toBe(1);
    expect(summary.failed).toBe(1);
    // File preserved so operator can retry.
    expect(fs.existsSync(path.join(tmpDir, '.test-live-ids-run-y.json'))).toBe(true);
  });

  it('returns an empty summary when there are no id-store files', async () => {
    const client = makeMockClient();
    const summary = await runCleanup(client, tmpDir);
    expect(summary.trashed).toBe(0);
    expect(summary.failed).toBe(0);
  });
});
