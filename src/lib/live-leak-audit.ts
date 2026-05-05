import type { BasecampClient } from './basecamp-client.js';
import { RECORDING_TYPES, type RecordingType } from './recording-types.js';

export { RECORDING_TYPES };
// Re-exported under both names so existing call sites keep working.
export type RecordingTypeName = RecordingType;

export interface Leak {
  type: RecordingType;
  id: string;
  title: string;
}

/**
 * Pull the user-facing label off a recording. Different BC3 resource
 * types stash it in different fields — switching on `type` instead of
 * conflating five fields means a future type added to RECORDING_TYPES
 * will produce a compile error here, not a silent leak miss.
 */
function titleOf(type: RecordingType, item: Record<string, unknown>): string | undefined {
  switch (type) {
    case 'Todo':
    case 'Comment':
      return typeof item.content === 'string' ? item.content : undefined;
    case 'Todolist':
      return typeof item.name === 'string' ? item.name : undefined;
    case 'Message':
      return typeof item.subject === 'string' ? item.subject : undefined;
    case 'Schedule::Entry':
      return typeof item.summary === 'string' ? item.summary : undefined;
  }
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
      const title = titleOf(type, item);
      if (title?.includes(prefix)) {
        leaks.push({ type, id: String(item.id), title });
      }
    }
  }
  return leaks;
}
