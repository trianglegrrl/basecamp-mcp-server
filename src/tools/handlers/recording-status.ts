import type { BasecampClient } from '../../lib/basecamp-client.js';
import { successResult, type MCPToolResultEnvelope } from '../result.js';
import type { RecordingStatus } from '../../types/basecamp.js';

function makeStatusHandler(idKey: string) {
  return async function setStatus(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
    const recordingId = args[idKey];
    const status = args.status as RecordingStatus;
    await c.setRecordingStatus(args.project_id, recordingId, status);
    return successResult({ message: `Status set to ${status}` });
  };
}

export const handlers = {
  set_todo_status:           makeStatusHandler('todo_id'),
  set_todolist_status:       makeStatusHandler('todolist_id'),
  set_message_status:        makeStatusHandler('message_id'),
  set_comment_status:        makeStatusHandler('comment_id'),
  set_schedule_entry_status: makeStatusHandler('entry_id'),
} as const;
