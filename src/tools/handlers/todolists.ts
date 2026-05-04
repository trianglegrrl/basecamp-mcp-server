import type { BasecampClient } from '../../lib/basecamp-client.js';
import { successResult, type MCPToolResultEnvelope } from '../result.js';

async function getTodolist(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const todolist = await c.getTodolist(args.project_id, args.todolist_id);
  return successResult({ todolist });
}

async function createTodolist(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const todolist = await c.createTodolist(args.project_id, args.todoset_id, {
    name: args.name,
    description: args.description,
  });
  return successResult({ todolist, message: `Todo list '${args.name}' created` });
}

async function updateTodolist(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const { project_id, todolist_id, ...patch } = args;
  const todolist = await c.updateTodolist(project_id, todolist_id, patch);
  return successResult({ todolist, message: 'Todo list updated' });
}

export const handlers = {
  get_todolist: getTodolist,
  create_todolist: createTodolist,
  update_todolist: updateTodolist,
} as const;
