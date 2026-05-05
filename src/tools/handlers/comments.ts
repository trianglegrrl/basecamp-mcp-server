import { z } from 'zod';
import type { BasecampClient } from '../../lib/basecamp-client.js';
import { successResult, type MCPToolResultEnvelope } from '../result.js';

const ProjectCommentArgs = z.object({ project_id: z.string(), comment_id: z.string() });

const CreateCommentArgs = z.object({
  project_id: z.string(),
  recording_id: z.string(),
  content: z.string(),
});

const UpdateCommentArgs = z.object({
  project_id: z.string(),
  comment_id: z.string(),
  content: z.string().optional(),
});

async function getComment(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectCommentArgs.parse(rawArgs);
  const comment = await c.getComment(args.project_id, args.comment_id);
  return successResult({ comment });
}

async function createComment(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = CreateCommentArgs.parse(rawArgs);
  const comment = await c.createComment(args.project_id, args.recording_id, { content: args.content });
  return successResult({ comment, message: 'Comment posted' });
}

async function updateComment(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = UpdateCommentArgs.parse(rawArgs);
  const { project_id, comment_id, ...patch } = args;
  const comment = await c.updateComment(project_id, comment_id, patch);
  return successResult({ comment, message: 'Comment updated' });
}

export const handlers = {
  get_comment: getComment,
  create_comment: createComment,
  update_comment: updateComment,
} as const;
