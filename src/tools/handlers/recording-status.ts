import { z } from 'zod';
import type { BasecampClient } from '../../lib/basecamp-client.js';
import { successResult, type MCPToolResultEnvelope } from '../result.js';

const StatusEnum = z.enum(['active', 'archived', 'trashed']);
const ProjectIdSchema = z.string();
const RecordingIdSchema = z.string();

// The id field name varies per resource (todo_id, message_id, ...).
// Validate each field individually rather than building a schema with
// a dynamic computed key — TypeScript can't narrow .parse() results
// keyed by a runtime variable, and field-by-field zod validation
// gives a real runtime guarantee for the status enum that the previous
// `as RecordingStatus` cast did not.
function makeStatusHandler(idKey: string) {
  return async function setStatus(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
    const projectId = ProjectIdSchema.parse(rawArgs.project_id);
    const recordingId = RecordingIdSchema.parse(rawArgs[idKey]);
    const status = StatusEnum.parse(rawArgs.status);
    await c.setRecordingStatus(projectId, recordingId, status);
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
