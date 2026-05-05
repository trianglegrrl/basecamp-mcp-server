import { z } from 'zod';
import type { BasecampClient } from '../../lib/basecamp-client.js';
import { successResult, type MCPToolResultEnvelope } from '../result.js';

const ProjectTodoArgs = z.object({ project_id: z.string(), todo_id: z.string() });

// Body fields shared by create + update (per src/types/basecamp.ts).
const TodoBodyShape = {
  content: z.string().optional(),
  description: z.string().optional(),
  assignee_ids: z.array(z.union([z.string(), z.number()])).optional(),
  completion_subscriber_ids: z.array(z.union([z.string(), z.number()])).optional(),
  due_on: z.string().optional(),
  starts_on: z.string().optional(),
  notify: z.boolean().optional(),
};

const CreateTodoArgs = z.object({
  project_id: z.string(),
  todolist_id: z.string(),
  ...TodoBodyShape,
  // content is required for create
  content: z.string(),
});

const UpdateTodoArgs = z.object({
  project_id: z.string(),
  todo_id: z.string(),
  ...TodoBodyShape,
});

const RepositionTodoArgs = z.object({
  project_id: z.string(),
  todo_id: z.string(),
  position: z.number(),
  parent_id: z.string().optional(),
});

async function getTodo(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectTodoArgs.parse(rawArgs);
  const todo = await c.getTodo(args.project_id, args.todo_id);
  return successResult({ todo });
}

async function createTodo(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = CreateTodoArgs.parse(rawArgs);
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

async function updateTodo(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = UpdateTodoArgs.parse(rawArgs);
  const { project_id, todo_id, ...patch } = args;
  const todo = await c.updateTodo(project_id, todo_id, patch);
  return successResult({ todo, message: `Todo updated` });
}

async function completeTodo(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectTodoArgs.parse(rawArgs);
  await c.completeTodo(args.project_id, args.todo_id);
  return successResult({ message: 'Todo marked complete' });
}

async function uncompleteTodo(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectTodoArgs.parse(rawArgs);
  await c.uncompleteTodo(args.project_id, args.todo_id);
  return successResult({ message: 'Todo marked incomplete' });
}

async function repositionTodo(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = RepositionTodoArgs.parse(rawArgs);
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
