import type { BasecampClient } from '../../lib/basecamp-client.js';
import { successResult, type MCPToolResultEnvelope } from '../result.js';

async function getComment(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const comment = await c.getComment(args.project_id, args.comment_id);
  return successResult({ comment });
}

async function createComment(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const comment = await c.createComment(args.project_id, args.recording_id, { content: args.content });
  return successResult({ comment, message: 'Comment posted' });
}

async function updateComment(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const { project_id, comment_id, ...patch } = args;
  const comment = await c.updateComment(project_id, comment_id, patch);
  return successResult({ comment, message: 'Comment updated' });
}

export const handlers = {
  get_comment: getComment,
  create_comment: createComment,
  update_comment: updateComment,
} as const;
