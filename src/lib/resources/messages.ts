import type { AxiosInstance } from 'axios';
import { applyUpdate } from '../update-merge.js';
import { getDockEntryWithDetails } from './dock.js';
import type {
  Message,
  MessageBoard,
  MessageCreateBody,
  MessageUpdateBody,
  CreateMessageInput,
} from '../../types/basecamp.js';

const MESSAGE_UPDATE_WHITELIST = [
  'subject',
  'content',
  'category_id',
] as const satisfies ReadonlyArray<keyof MessageUpdateBody & keyof Message>;

export async function getMessageBoard(
  client: AxiosInstance,
  projectId: string,
): Promise<MessageBoard> {
  return getDockEntryWithDetails<MessageBoard>(
    client,
    projectId,
    'message_board',
    (p, id) => `/buckets/${p}/message_boards/${id}.json`,
  );
}

export async function getMessages(
  client: AxiosInstance,
  projectId: string,
  messageBoardId: string,
): Promise<Message[]> {
  const response = await client.get(
    `/buckets/${projectId}/message_boards/${messageBoardId}/messages.json`,
  );
  return response.data;
}

export async function getMessage(
  client: AxiosInstance,
  projectId: string,
  messageId: string,
): Promise<Message> {
  const response = await client.get(`/buckets/${projectId}/messages/${messageId}.json`);
  return response.data;
}

export async function createMessage(
  client: AxiosInstance,
  projectId: string,
  messageBoardId: string,
  input: CreateMessageInput,
): Promise<Message> {
  const body: MessageCreateBody = { ...input, status: 'active' };
  const response = await client.post(
    `/buckets/${projectId}/message_boards/${messageBoardId}/messages.json`,
    body,
  );
  return response.data;
}

export async function updateMessage(
  client: AxiosInstance,
  projectId: string,
  messageId: string,
  patch: MessageUpdateBody,
): Promise<Message> {
  return applyUpdate<Message, MessageUpdateBody>(
    'full',
    patch,
    () => getMessage(client, projectId, messageId),
    async (body) => {
      const response = await client.put(
        `/buckets/${projectId}/messages/${messageId}.json`,
        body,
      );
      return response.data;
    },
    MESSAGE_UPDATE_WHITELIST,
  );
}
