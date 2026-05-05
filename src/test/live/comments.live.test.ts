import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootstrapLive, afterAllLiveTests, type LiveContext } from './_setup.js';

let ctx: LiveContext;
let parentTodoId: string;
let createdSandboxListId: string | null = null;

beforeAll(async () => {
  ctx = await bootstrapLive();
  // Resolve a todolist to attach the parent todo to.
  const lists = await ctx.client.getTodoLists(ctx.projectId);
  let todolistId: string;
  if (lists.length > 0) {
    todolistId = String((lists[0] as { id: string | number }).id);
  } else {
    const project = await ctx.client.getProject(ctx.projectId);
    const todoset = project.dock.find((d: { name: string }) => d.name === 'todoset');
    if (!todoset) throw new Error('Sandbox project has no todoset.');
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
  // Create the parent todo we'll comment on.
  const parentResult = await ctx.call('create_todo', {
    project_id: ctx.projectId,
    todolist_id: todolistId,
    content: `${ctx.prefix} comment-parent`,
  });
  const parentTodo = parentResult.todo as { id: string | number };
  parentTodoId = String(parentTodo.id);
  ctx.store.record({ recording_id: parentTodoId, type: 'Todo', project_id: ctx.projectId });
});

afterAll(async () => {
  if (!ctx) return;
  // Trash the parent fixtures beforeAll created. Swallow individual errors so
  // the leak audit still runs and surfaces anything that survives.
  await ctx.call('set_todo_status', {
    project_id: ctx.projectId, todo_id: parentTodoId, status: 'trashed',
  }).catch(() => {});
  if (createdSandboxListId) {
    await ctx.call('set_todolist_status', {
      project_id: ctx.projectId, todolist_id: createdSandboxListId, status: 'trashed',
    }).catch(() => {});
  }
  await afterAllLiveTests(ctx);
});

describe('comments lifecycle (LIVE, via dispatch)', () => {
  let commentId: string;

  it('create_comment: posts a prefixed comment and records its ID', async () => {
    const r = await ctx.call('create_comment', {
      project_id: ctx.projectId,
      recording_id: parentTodoId,
      content: `<div>${ctx.prefix} initial comment</div>`,
    });
    const comment = r.comment as { id: string | number; content: string };
    commentId = String(comment.id);
    ctx.store.record({ recording_id: commentId, type: 'Comment', project_id: ctx.projectId });
    expect(comment.content).toContain(ctx.prefix);
  });

  it('get_comment: round-trips the created content', async () => {
    const r = await ctx.call('get_comment', {
      project_id: ctx.projectId, comment_id: commentId,
    });
    expect((r.comment as { content: string }).content).toContain(ctx.prefix);
  });

  it("update_comment: 'partial' PUT writes the new content (single field — no merge needed)", async () => {
    await ctx.call('update_comment', {
      project_id: ctx.projectId,
      comment_id: commentId,
      content: `<div>${ctx.prefix} updated comment</div>`,
    });
    const r = await ctx.call('get_comment', {
      project_id: ctx.projectId, comment_id: commentId,
    });
    expect((r.comment as { content: string }).content).toContain('updated comment');
  });

  it('set_comment_status: trashed', async () => {
    await ctx.call('set_comment_status', {
      project_id: ctx.projectId, comment_id: commentId, status: 'trashed',
    });
    const r = await ctx.call('get_comment', {
      project_id: ctx.projectId, comment_id: commentId,
    });
    expect((r.comment as { status: string }).status).toBe('trashed');
  });

  it('set_comment_status: idempotent', async () => {
    await expect(ctx.call('set_comment_status', {
      project_id: ctx.projectId, comment_id: commentId, status: 'trashed',
    })).resolves.toMatchObject({ status: 'success' });
  });
});
