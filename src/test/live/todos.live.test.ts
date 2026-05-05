import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootstrapLive, afterAllLiveTests, type LiveContext } from './_setup.js';

let ctx: LiveContext;
let todolistId: string;
let createdSandboxListId: string | null = null;

beforeAll(async () => {
  ctx = await bootstrapLive();
  // Resolve the project's todoset to find a list to write into.
  const project = await ctx.client.getProject(ctx.projectId);
  const todoset = project.dock.find((d: { name: string }) => d.name === 'todoset');
  if (!todoset) throw new Error('Sandbox project has no todoset.');
  // Reuse the first todolist if any exists; otherwise create a sandbox list.
  const lists = await ctx.client.getTodoLists(ctx.projectId);
  if (lists.length > 0) {
    todolistId = String((lists[0] as { id: string | number }).id);
  } else {
    const created = await ctx.call('create_todolist', {
      project_id: ctx.projectId,
      todoset_id: String(todoset.id),
      name: `${ctx.prefix} sandbox list`,
    });
    const todolist = created.todolist as { id: string | number };
    todolistId = String(todolist.id);
    createdSandboxListId = todolistId;
    ctx.store.record({ recording_id: todolistId, type: 'Todolist', project_id: ctx.projectId });
  }
});

afterAll(async () => {
  if (!ctx) return;
  if (createdSandboxListId) {
    await ctx.call('set_todolist_status', {
      project_id: ctx.projectId, todolist_id: createdSandboxListId, status: 'trashed',
    }).catch(() => {});
  }
  await afterAllLiveTests(ctx);
});

describe('todos lifecycle (LIVE, via dispatch)', () => {
  let todoId: string;

  it('create_todo: creates a prefixed todo and records its ID', async () => {
    const r = await ctx.call('create_todo', {
      project_id: ctx.projectId,
      todolist_id: todolistId,
      content: `${ctx.prefix} create-then-trash`,
      description: 'initial',
      due_on: '2026-12-31',
    });
    const todo = r.todo as { id: string | number; content: string };
    todoId = String(todo.id);
    ctx.store.record({ recording_id: todoId, type: 'Todo', project_id: ctx.projectId });
    expect(todo.content).toContain(ctx.prefix);
  });

  it('get_todo: round-trips the created fields', async () => {
    const r = await ctx.call('get_todo', { project_id: ctx.projectId, todo_id: todoId });
    const todo = r.todo as { content: string; due_on: string };
    expect(todo.content).toContain(ctx.prefix);
    expect(todo.due_on).toBe('2026-12-31');
  });

  it("update_todo: 'full' merge preserves description while changing content", async () => {
    await ctx.call('update_todo', {
      project_id: ctx.projectId, todo_id: todoId, content: `${ctx.prefix} updated content`,
    });
    const r = await ctx.call('get_todo', { project_id: ctx.projectId, todo_id: todoId });
    const todo = r.todo as { content: string; description: string };
    expect(todo.content).toContain('updated content');
    expect(todo.description).toBe('initial'); // proves merge worked
  });

  it('set_todo_status: trashed', async () => {
    await ctx.call('set_todo_status', {
      project_id: ctx.projectId, todo_id: todoId, status: 'trashed',
    });
    const r = await ctx.call('get_todo', { project_id: ctx.projectId, todo_id: todoId });
    expect((r.todo as { status: string }).status).toBe('trashed');
  });

  it('set_todo_status: idempotent (trashing twice succeeds)', async () => {
    await expect(ctx.call('set_todo_status', {
      project_id: ctx.projectId, todo_id: todoId, status: 'trashed',
    })).resolves.toMatchObject({ status: 'success' });
  });
});
