import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootstrapLive, afterAllLiveTests, type LiveContext } from './_setup.js';

let ctx: LiveContext;
let todosetId: string;

beforeAll(async () => {
  ctx = await bootstrapLive();
  const project = await ctx.client.getProject(ctx.projectId);
  const todoset = project.dock.find((d: any) => d.name === 'todoset');
  if (!todoset) throw new Error('Sandbox project has no todoset.');
  todosetId = String(todoset.id);
});

afterAll(async () => {
  if (ctx) await afterAllLiveTests(ctx);
});

describe('todolists lifecycle (LIVE)', () => {
  let todolistId: string;

  it('create_todolist: creates a prefixed list and records its ID', async () => {
    const created = await ctx.client.createTodolist(ctx.projectId, todosetId, {
      name: `${ctx.prefix} create-then-trash`,
      description: 'initial description',
    });
    todolistId = String((created as any).id);
    ctx.store.record({ recording_id: todolistId, type: 'Todolist', project_id: ctx.projectId });
    expect((created as any).name).toContain(ctx.prefix);
  });

  it('get_todolist: round-trips the created fields', async () => {
    const fetched = await ctx.client.getTodolist(ctx.projectId, todolistId);
    expect((fetched as any).name).toContain(ctx.prefix);
  });

  it("update_todolist: 'full' merge preserves description while changing name", async () => {
    await ctx.client.updateTodolist(ctx.projectId, todolistId, {
      name: `${ctx.prefix} updated name`,
    });
    const fetched = await ctx.client.getTodolist(ctx.projectId, todolistId);
    expect((fetched as any).name).toContain('updated name');
    expect((fetched as any).description).toContain('initial description');
  });

  it('set_todolist_status: trashed', async () => {
    await ctx.client.setRecordingStatus(ctx.projectId, todolistId, 'trashed');
    const fetched = await ctx.client.getTodolist(ctx.projectId, todolistId);
    expect((fetched as any).status).toBe('trashed');
  });

  it('set_todolist_status: idempotent', async () => {
    await expect(
      ctx.client.setRecordingStatus(ctx.projectId, todolistId, 'trashed'),
    ).resolves.not.toThrow();
  });
});
