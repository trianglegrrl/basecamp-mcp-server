import { z } from 'zod';
import type { BasecampClient } from '../../lib/basecamp-client.js';
import { successResult, type MCPToolResultEnvelope } from '../result.js';

const ProjectTodolistArgs = z.object({ project_id: z.string(), todolist_id: z.string() });

const CreateTodolistArgs = z.object({
  project_id: z.string(),
  todoset_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
});

const UpdateTodolistArgs = z.object({
  project_id: z.string(),
  todolist_id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
});

async function getTodolist(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectTodolistArgs.parse(rawArgs);
  const todolist = await c.getTodolist(args.project_id, args.todolist_id);
  return successResult({ todolist });
}

async function createTodolist(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = CreateTodolistArgs.parse(rawArgs);
  const todolist = await c.createTodolist(args.project_id, args.todoset_id, {
    name: args.name,
    description: args.description,
  });
  return successResult({ todolist, message: `Todo list '${args.name}' created` });
}

async function updateTodolist(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = UpdateTodolistArgs.parse(rawArgs);
  const { project_id, todolist_id, ...patch } = args;
  const todolist = await c.updateTodolist(project_id, todolist_id, patch);
  return successResult({ todolist, message: 'Todo list updated' });
}

export const handlers = {
  get_todolist: getTodolist,
  create_todolist: createTodolist,
  update_todolist: updateTodolist,
} as const;
