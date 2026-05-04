import * as fs from 'node:fs';
import * as path from 'node:path';

export type RecordingType =
  | 'Todo' | 'Todolist' | 'Message' | 'Comment' | 'Schedule::Entry';

export interface CapturedId {
  recording_id: string;
  type: RecordingType;
  project_id: string;
}

export interface IdStore {
  runId: string;
  filePath: string;
  record(entry: CapturedId): void;
  read(): CapturedId[];
}

function fileFor(runId: string, dir: string): string {
  return path.join(dir, `.test-live-ids-${runId}.json`);
}

export function createIdStore(runId: string, dir: string): IdStore {
  const filePath = fileFor(runId, dir);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2), 'utf-8');
  }
  return {
    runId,
    filePath,
    record(entry) {
      const current: CapturedId[] = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      current.push(entry);
      fs.writeFileSync(filePath, JSON.stringify(current, null, 2), 'utf-8');
    },
    read() {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    },
  };
}

export function readAllIdStores(dir: string): CapturedId[] {
  if (!fs.existsSync(dir)) return [];
  const files = fs.readdirSync(dir).filter((f) =>
    f.startsWith('.test-live-ids-') && f.endsWith('.json'),
  );
  const out: CapturedId[] = [];
  for (const f of files) {
    const entries: CapturedId[] = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
    out.push(...entries);
  }
  return out;
}

export function deleteIdStore(runId: string, dir: string): void {
  const filePath = fileFor(runId, dir);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
