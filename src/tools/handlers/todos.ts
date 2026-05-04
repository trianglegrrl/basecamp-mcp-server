import type { BasecampClient } from '../../lib/basecamp-client.js';
import { successResult, type MCPToolResultEnvelope } from '../result.js';

async function getTodo(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const todo = await c.getTodo(args.project_id, args.todo_id);
  return successResult({ todo });
}

async function createTodo(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const todo = await c.createTodo(args.project_id, args.todolist_id, {
    content: args.content,
    description: args.description,
    assignee_ids: args.assignee_ids,
    completion_subscriber_ids: args.completion_subscriber_ids,
    due_on: args.due_on,
    starts_on: args.starts_on,
    notify: args.notify,
  });
  return successResult({ todo, message: `Todo '${args.content}' created` });
}

async function updateTodo(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const { project_id, todo_id, ...patch } = args;
  const todo = await c.updateTodo(project_id, todo_id, patch);
  return successResult({ todo, message: `Todo updated` });
}

async function completeTodo(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  await c.completeTodo(args.project_id, args.todo_id);
  return successResult({ message: 'Todo marked complete' });
}

async function uncompleteTodo(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  await c.uncompleteTodo(args.project_id, args.todo_id);
  return successResult({ message: 'Todo marked incomplete' });
}

async function repositionTodo(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  await c.repositionTodo(args.project_id, args.todo_id, args.position, args.parent_id);
  return successResult({ message: `Todo repositioned to ${args.position}` });
}

export const handlers = {
  get_todo: getTodo,
  create_todo: createTodo,
  update_todo: updateTodo,
  complete_todo: completeTodo,
  uncomplete_todo: uncompleteTodo,
  reposition_todo: repositionTodo,
} as const;
