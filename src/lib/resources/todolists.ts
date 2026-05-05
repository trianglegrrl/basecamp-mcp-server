import type { AxiosInstance } from 'axios';
import { applyUpdate } from '../update-merge.js';
import type {
  TodoList,
  TodolistCreateBody,
  TodolistUpdateBody,
} from '../../types/basecamp.js';

const TODOLIST_UPDATE_WHITELIST = [
  'name',
  'description',
] as const satisfies ReadonlyArray<keyof TodolistUpdateBody & keyof TodoList>;

export async function getTodolist(
  client: AxiosInstance,
  projectId: string,
  todolistId: string,
): Promise<TodoList> {
  const response = await client.get(`/buckets/${projectId}/todolists/${todolistId}.json`);
  return response.data;
}

export async function createTodolist(
  client: AxiosInstance,
  projectId: string,
  todosetId: string,
  body: TodolistCreateBody,
): Promise<TodoList> {
  const response = await client.post(
    `/buckets/${projectId}/todosets/${todosetId}/todolists.json`,
    body,
  );
  return response.data;
}

export async function updateTodolist(
  client: AxiosInstance,
  projectId: string,
  todolistId: string,
  patch: TodolistUpdateBody,
): Promise<TodoList> {
  return applyUpdate<TodoList, TodolistUpdateBody>(
    'full',
    patch,
    () => getTodolist(client, projectId, todolistId),
    async (body) => {
      const response = await client.put(
        `/buckets/${projectId}/todolists/${todolistId}.json`,
        body,
      );
      return response.data;
    },
    TODOLIST_UPDATE_WHITELIST,
  );
}
