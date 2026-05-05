import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootstrapLive, afterAllLiveTests, type LiveContext } from './_setup.js';

let ctx: LiveContext;
let messageBoardId: string;

beforeAll(async () => {
  ctx = await bootstrapLive();
  const r = await ctx.call('get_message_board', { project_id: ctx.projectId });
  const board = r.message_board as { id: string | number };
  messageBoardId = String(board.id);
});

afterAll(async () => {
  if (ctx) await afterAllLiveTests(ctx);
});

describe('messages lifecycle (LIVE, via dispatch)', () => {
  let messageId: string;

  it('create_message: posts a prefixed message and records its ID', async () => {
    const r = await ctx.call('create_message', {
      project_id: ctx.projectId,
      message_board_id: messageBoardId,
      subject: `${ctx.prefix} create-then-trash`,
      content: '<div>initial body</div>',
    });
    const message = r.message as { id: string | number; subject: string };
    messageId = String(message.id);
    ctx.store.record({ recording_id: messageId, type: 'Message', project_id: ctx.projectId });
    expect(message.subject).toContain(ctx.prefix);
  });

  it('get_message: round-trips the created fields', async () => {
    const r = await ctx.call('get_message', { project_id: ctx.projectId, message_id: messageId });
    const message = r.message as { subject: string; content: string };
    expect(message.subject).toContain(ctx.prefix);
    expect(message.content).toContain('initial body');
  });

  it("update_message: 'full' merge preserves content while changing subject", async () => {
    await ctx.call('update_message', {
      project_id: ctx.projectId, message_id: messageId, subject: `${ctx.prefix} updated subject`,
    });
    const r = await ctx.call('get_message', { project_id: ctx.projectId, message_id: messageId });
    const message = r.message as { subject: string; content: string };
    expect(message.subject).toContain('updated subject');
    expect(message.content).toContain('initial body');
  });

  it('set_message_status: trashed', async () => {
    await ctx.call('set_message_status', {
      project_id: ctx.projectId, message_id: messageId, status: 'trashed',
    });
    const r = await ctx.call('get_message', { project_id: ctx.projectId, message_id: messageId });
    expect((r.message as { status: string }).status).toBe('trashed');
  });

  it('set_message_status: idempotent', async () => {
    await expect(ctx.call('set_message_status', {
      project_id: ctx.projectId, message_id: messageId, status: 'trashed',
    })).resolves.toMatchObject({ status: 'success' });
  });
});
