import type { BasecampClient } from './basecamp-client.js';

export const RECORDING_TYPES = [
  'Todo', 'Todolist', 'Message', 'Comment', 'Schedule::Entry',
] as const;

export type RecordingTypeName = typeof RECORDING_TYPES[number];

export interface Leak {
  type: RecordingTypeName;
  id: string;
  title?: string;
}

function titleOf(item: any): string | undefined {
  return item?.title ?? item?.name ?? item?.subject ?? item?.summary ?? item?.content;
}

export async function auditForLeaks(
  client: BasecampClient,
  projectId: string,
  prefix: string,
): Promise<Leak[]> {
  const leaks: Leak[] = [];
  for (const type of RECORDING_TYPES) {
    const items = await client.getRecordings({ type, bucket: projectId, status: 'active' });
    for (const item of items) {
      const title = titleOf(item);
      if (title?.includes(prefix)) {
        leaks.push({ type, id: String(item.id), title });
      }
    }
  }
  return leaks;
}
