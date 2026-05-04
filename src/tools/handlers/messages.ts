import type { BasecampClient } from '../../lib/basecamp-client.js';
import { successResult, type MCPToolResultEnvelope } from '../result.js';

async function getMessageBoard(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const message_board = await c.getMessageBoard(args.project_id);
  return successResult({ message_board });
}

async function getMessages(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const messages = await c.getMessages(args.project_id, args.message_board_id);
  return successResult({ messages, count: messages.length });
}

async function getMessage(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const message = await c.getMessage(args.project_id, args.message_id);
  return successResult({ message });
}

async function createMessage(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const message = await c.createMessage(args.project_id, args.message_board_id, {
    subject: args.subject,
    content: args.content,
    category_id: args.category_id,
    subscriptions: args.subscriptions,
  });
  return successResult({ message, status_message: `Message '${args.subject}' posted` });
}

async function updateMessage(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
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
