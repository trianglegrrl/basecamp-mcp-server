import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootstrapLive, afterAllLiveTests, type LiveContext } from './_setup.js';

let ctx: LiveContext;
let parentTodoId: string;

beforeAll(async () => {
  ctx = await bootstrapLive();
  // Resolve a todolist to attach the parent todo to.
  const lists = await ctx.client.getTodoLists(ctx.projectId);
  let todolistId: string;
  if (lists.length > 0) {
    todolistId = String((lists[0] as any).id);
  } else {
    const project = await ctx.client.getProject(ctx.projectId);
    const todoset = project.dock.find((d: any) => d.name === 'todoset');
    if (!todoset) throw new Error('Sandbox project has no todoset.');
    const created = await ctx.client.createTodolist(
      ctx.projectId, String(todoset.id), { name: `${ctx.prefix} sandbox list` },
    );
    todolistId = String((created as any).id);
    ctx.store.record({ recording_id: todolistId, type: 'Todolist', project_id: ctx.projectId });
  }
  // Create the parent todo we'll comment on.
  const parentTodo = await ctx.client.createTodo(ctx.projectId, todolistId, {
    content: `${ctx.prefix} comment-parent`,
  });
  parentTodoId = String((parentTodo as any).id);
  ctx.store.record({ recording_id: parentTodoId, type: 'Todo', project_id: ctx.projectId });
});

afterAll(async () => {
  if (ctx) await afterAllLiveTests(ctx);
});

describe('comments lifecycle (LIVE)', () => {
  let commentId: string;

  it('create_comment: posts a prefixed comment and records its ID', async () => {
    const created = await ctx.client.createComment(ctx.projectId, parentTodoId, {
      content: `<div>${ctx.prefix} initial comment</div>`,
    });
    commentId = String((created as any).id);
    ctx.store.record({ recording_id: commentId, type: 'Comment', project_id: ctx.projectId });
    expect((created as any).content).toContain(ctx.prefix);
  });

  it('get_comment: round-trips the created content', async () => {
    const fetched = await ctx.client.getComment(ctx.projectId, commentId);
    expect((fetched as any).content).toContain(ctx.prefix);
  });

  it("update_comment: 'partial' PUT writes the new content (single field — no merge needed)", async () => {
    await ctx.client.updateComment(ctx.projectId, commentId, {
      content: `<div>${ctx.prefix} updated comment</div>`,
    });
    const fetched = await ctx.client.getComment(ctx.projectId, commentId);
    expect((fetched as any).content).toContain('updated comment');
  });

  it('set_comment_status: trashed', async () => {
    await ctx.client.setRecordingStatus(ctx.projectId, commentId, 'trashed');
    const fetched = await ctx.client.getComment(ctx.projectId, commentId);
    expect((fetched as any).status).toBe('trashed');
  });

  it('set_comment_status: idempotent', async () => {
    await expect(
      ctx.client.setRecordingStatus(ctx.projectId, commentId, 'trashed'),
    ).resolves.not.toThrow();
  });
});
