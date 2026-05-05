import type { AxiosInstance } from 'axios';
import { applyUpdate } from '../update-merge.js';
import type { Todo, TodoCreateBody, TodoUpdateBody } from '../../types/basecamp.js';

const TODO_UPDATE_WHITELIST = [
  'content',
  'description',
  'assignee_ids',
  'completion_subscriber_ids',
  'due_on',
  'starts_on',
  'notify',
] as const satisfies ReadonlyArray<keyof TodoUpdateBody & keyof Todo>;

export async function getTodo(
  client: AxiosInstance,
  projectId: string,
  todoId: string,
): Promise<Todo> {
  const response = await client.get(`/buckets/${projectId}/todos/${todoId}.json`);
  return response.data;
}

export async function createTodo(
  client: AxiosInstance,
  projectId: string,
  todolistId: string,
  body: TodoCreateBody,
): Promise<Todo> {
  const response = await client.post(
    `/buckets/${projectId}/todolists/${todolistId}/todos.json`,
    body,
  );
  return response.data;
}

export async function updateTodo(
  client: AxiosInstance,
  projectId: string,
  todoId: string,
  patch: TodoUpdateBody,
): Promise<Todo> {
  return applyUpdate<Todo, TodoUpdateBody>(
    'full',
    patch,
    () => getTodo(client, projectId, todoId),
    async (body) => {
      const response = await client.put(
        `/buckets/${projectId}/todos/${todoId}.json`,
        body,
      );
      return response.data;
    },
    TODO_UPDATE_WHITELIST,
  );
}

export async function completeTodo(
  client: AxiosInstance,
  projectId: string,
  todoId: string,
): Promise<void> {
  await client.post(`/buckets/${projectId}/todos/${todoId}/completion.json`);
}

export async function uncompleteTodo(
  client: AxiosInstance,
  projectId: string,
  todoId: string,
): Promise<void> {
  await client.delete(`/buckets/${projectId}/todos/${todoId}/completion.json`);
}

export async function repositionTodo(
  client: AxiosInstance,
  projectId: string,
  todoId: string,
  position: number,
  parentId?: string,
): Promise<void> {
  const body: { position: number; parent_id?: string } = { position };
  if (parentId !== undefined) body.parent_id = parentId;
  await client.put(`/buckets/${projectId}/todos/${todoId}/position.json`, body);
}
