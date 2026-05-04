import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootstrapLive, afterAllLiveTests, type LiveContext } from './_setup.js';

let ctx: LiveContext;
let todolistId: string;

beforeAll(async () => {
  ctx = await bootstrapLive();
  // Resolve the project's todoset to find a list to write into.
  const project = await ctx.client.getProject(ctx.projectId);
  const todoset = project.dock.find((d: any) => d.name === 'todoset');
  if (!todoset) throw new Error('Sandbox project has no todoset.');
  // Reuse the first todolist if any exists; otherwise create a sandbox list.
  const lists = await ctx.client.getTodoLists(ctx.projectId);
  if (lists.length > 0) {
    todolistId = String((lists[0] as any).id);
  } else {
    const created = await ctx.client.createTodolist(
      ctx.projectId, String(todoset.id), { name: `${ctx.prefix} sandbox list` },
    );
    todolistId = String((created as any).id);
    ctx.store.record({ recording_id: todolistId, type: 'Todolist', project_id: ctx.projectId });
  }
});

afterAll(async () => {
  if (ctx) await afterAllLiveTests(ctx);
});

describe('todos lifecycle (LIVE)', () => {
  let todoId: string;

  it('create_todo: creates a prefixed todo and records its ID', async () => {
    const created = await ctx.client.createTodo(ctx.projectId, todolistId, {
      content: `${ctx.prefix} create-then-trash`,
      description: 'initial',
      due_on: '2026-12-31',
    });
    todoId = String((created as any).id);
    ctx.store.record({ recording_id: todoId, type: 'Todo', project_id: ctx.projectId });
    expect((created as any).content).toContain(ctx.prefix);
  });

  it('get_todo: round-trips the created fields', async () => {
    const fetched = await ctx.client.getTodo(ctx.projectId, todoId);
    expect((fetched as any).content).toContain(ctx.prefix);
    expect((fetched as any).due_on).toBe('2026-12-31');
  });

  it("update_todo: 'full' merge preserves description while changing content", async () => {
    await ctx.client.updateTodo(ctx.projectId, todoId, { content: `${ctx.prefix} updated content` });
    const fetched = await ctx.client.getTodo(ctx.projectId, todoId);
    expect((fetched as any).content).toContain('updated content');
    expect((fetched as any).description).toBe('initial'); // proves merge worked
  });

  it('set_todo_status: trashed', async () => {
    await ctx.client.setRecordingStatus(ctx.projectId, todoId, 'trashed');
    const fetched = await ctx.client.getTodo(ctx.projectId, todoId);
    expect((fetched as any).status).toBe('trashed');
  });

  it('set_todo_status: idempotent (trashing twice succeeds)', async () => {
    await expect(
      ctx.client.setRecordingStatus(ctx.projectId, todoId, 'trashed'),
    ).resolves.not.toThrow();
  });
});
