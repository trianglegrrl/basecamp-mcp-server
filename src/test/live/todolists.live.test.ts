import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootstrapLive, afterAllLiveTests, type LiveContext } from './_setup.js';

let ctx: LiveContext;
let todosetId: string;

beforeAll(async () => {
  ctx = await bootstrapLive();
  const project = await ctx.client.getProject(ctx.projectId);
  const todoset = project.dock.find((d: { name: string }) => d.name === 'todoset');
  if (!todoset) throw new Error('Sandbox project has no todoset.');
  todosetId = String(todoset.id);
});

afterAll(async () => {
  if (ctx) await afterAllLiveTests(ctx);
});

describe('todolists lifecycle (LIVE, via dispatch)', () => {
  let todolistId: string;

  it('create_todolist: creates a prefixed list and records its ID', async () => {
    const r = await ctx.call('create_todolist', {
      project_id: ctx.projectId,
      todoset_id: todosetId,
      name: `${ctx.prefix} create-then-trash`,
      description: 'initial description',
    });
    const todolist = r.todolist as { id: string | number; name: string };
    todolistId = String(todolist.id);
    ctx.store.record({ recording_id: todolistId, type: 'Todolist', project_id: ctx.projectId });
    expect(todolist.name).toContain(ctx.prefix);
  });

  it('get_todolist: round-trips the created fields', async () => {
    const r = await ctx.call('get_todolist', {
      project_id: ctx.projectId, todolist_id: todolistId,
    });
    expect((r.todolist as { name: string }).name).toContain(ctx.prefix);
  });

  it("update_todolist: 'full' merge preserves description while changing name", async () => {
    await ctx.call('update_todolist', {
      project_id: ctx.projectId, todolist_id: todolistId, name: `${ctx.prefix} updated name`,
    });
    const r = await ctx.call('get_todolist', {
      project_id: ctx.projectId, todolist_id: todolistId,
    });
    const todolist = r.todolist as { name: string; description: string };
    expect(todolist.name).toContain('updated name');
    expect(todolist.description).toContain('initial description');
  });

  it('set_todolist_status: trashed', async () => {
    await ctx.call('set_todolist_status', {
      project_id: ctx.projectId, todolist_id: todolistId, status: 'trashed',
    });
    const r = await ctx.call('get_todolist', {
      project_id: ctx.projectId, todolist_id: todolistId,
    });
    expect((r.todolist as { status: string }).status).toBe('trashed');
  });

  it('set_todolist_status: idempotent', async () => {
    await expect(ctx.call('set_todolist_status', {
      project_id: ctx.projectId, todolist_id: todolistId, status: 'trashed',
    })).resolves.toMatchObject({ status: 'success' });
  });
});
