import { z } from 'zod';
import type { BasecampClient } from '../../lib/basecamp-client.js';
import { successResult, type MCPToolResultEnvelope } from '../result.js';

const ProjectIdArgs = z.object({ project_id: z.string() });
const ProjectMessageBoardArgs = z.object({
  project_id: z.string(),
  message_board_id: z.string(),
});
const ProjectMessageArgs = z.object({ project_id: z.string(), message_id: z.string() });

const CreateMessageArgs = z.object({
  project_id: z.string(),
  message_board_id: z.string(),
  subject: z.string(),
  content: z.string().optional(),
  category_id: z.union([z.string(), z.number()]).optional(),
  subscriptions: z.array(z.union([z.string(), z.number()])).optional(),
});

const UpdateMessageArgs = z.object({
  project_id: z.string(),
  message_id: z.string(),
  subject: z.string().optional(),
  content: z.string().optional(),
  category_id: z.union([z.string(), z.number()]).optional(),
});

async function getMessageBoard(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectIdArgs.parse(rawArgs);
  const message_board = await c.getMessageBoard(args.project_id);
  return successResult({ message_board });
}

async function getMessages(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectMessageBoardArgs.parse(rawArgs);
  const messages = await c.getMessages(args.project_id, args.message_board_id);
  return successResult({ messages, count: messages.length });
}

async function getMessage(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectMessageArgs.parse(rawArgs);
  const message = await c.getMessage(args.project_id, args.message_id);
  return successResult({ message });
}

async function createMessage(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = CreateMessageArgs.parse(rawArgs);
  const message = await c.createMessage(args.project_id, args.message_board_id, {
    subject: args.subject,
    content: args.content,
    category_id: args.category_id,
    subscriptions: args.subscriptions,
  });
  return successResult({ message, status_message: `Message '${args.subject}' posted` });
}

async function updateMessage(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = UpdateMessageArgs.parse(rawArgs);
  const { project_id, message_id, ...patch } = args;
  const message = await c.updateMessage(project_id, message_id, patch);
  return successResult({ message, status_message: 'Message updated' });
}

export const handlers = {
  get_message_board: getMessageBoard,
  get_messages: getMessages,
  get_message: getMessage,
  create_message: createMessage,
  update_message: updateMessage,
} as const;
