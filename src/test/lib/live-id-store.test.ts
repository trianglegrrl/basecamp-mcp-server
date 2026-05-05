import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  createIdStore,
  readAllIdStores,
  deleteIdStore,
} from '../../lib/live-id-store.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'mcp-live-test-'));
});
afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('createIdStore + record', () => {
  it('creates a per-run JSON file with the provided run id', () => {
    const store = createIdStore('run-abc', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.test-live-ids-run-abc.json'))).toBe(true);
    expect(store.runId).toBe('run-abc');
  });

  it('records (id, type, project_id) entries appended to disk immediately', () => {
    const store = createIdStore('run-1', tmpDir);
    store.record({ recording_id: '42', type: 'Todo', project_id: '100' });
    store.record({ recording_id: '43', type: 'Message', project_id: '100' });
    const raw = fs.readFileSync(path.join(tmpDir, '.test-live-ids-run-1.json'), 'utf-8');
    const parsed = JSON.parse(raw);
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ recording_id: '42', type: 'Todo', project_id: '100' });
    expect(parsed[1]).toEqual({ recording_id: '43', type: 'Message', project_id: '100' });
  });
});

describe('readAllIdStores', () => {
  it('returns all entries across all .test-live-ids-*.json files in a directory', () => {
    const a = createIdStore('run-a', tmpDir);
    const b = createIdStore('run-b', tmpDir);
    a.record({ recording_id: '1', type: 'Todo', project_id: '100' });
    b.record({ recording_id: '2', type: 'Message', project_id: '100' });
    const all = readAllIdStores(tmpDir);
    expect(all).toHaveLength(2);
    expect(all.map((e) => e.recording_id).sort()).toEqual(['1', '2']);
  });

  it('returns an empty array when no id-store files exist', () => {
    expect(readAllIdStores(tmpDir)).toEqual([]);
  });
});

describe('deleteIdStore', () => {
  it('removes the per-run file', () => {
    createIdStore('run-x', tmpDir);
    deleteIdStore('run-x', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, '.test-live-ids-run-x.json'))).toBe(false);
  });

  it('is a no-op if the file does not exist', () => {
    expect(() => deleteIdStore('run-nope', tmpDir)).not.toThrow();
  });
});
