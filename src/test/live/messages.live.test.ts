import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootstrapLive, afterAllLiveTests, type LiveContext } from './_setup.js';

let ctx: LiveContext;
let messageBoardId: string;

beforeAll(async () => {
  ctx = await bootstrapLive();
  const board = await ctx.client.getMessageBoard(ctx.projectId);
  messageBoardId = String((board as any).id);
});

afterAll(async () => {
  if (ctx) await afterAllLiveTests(ctx);
});

describe('messages lifecycle (LIVE)', () => {
  let messageId: string;

  it('create_message: posts a prefixed message and records its ID', async () => {
    const created = await ctx.client.createMessage(ctx.projectId, messageBoardId, {
      subject: `${ctx.prefix} create-then-trash`,
      content: '<div>initial body</div>',
    });
    messageId = String((created as any).id);
    ctx.store.record({ recording_id: messageId, type: 'Message', project_id: ctx.projectId });
    expect((created as any).subject).toContain(ctx.prefix);
  });

  it('get_message: round-trips the created fields', async () => {
    const fetched = await ctx.client.getMessage(ctx.projectId, messageId);
    expect((fetched as any).subject).toContain(ctx.prefix);
    expect((fetched as any).content).toContain('initial body');
  });

  it("update_message: 'full' merge preserves content while changing subject", async () => {
    await ctx.client.updateMessage(ctx.projectId, messageId, {
      subject: `${ctx.prefix} updated subject`,
    });
    const fetched = await ctx.client.getMessage(ctx.projectId, messageId);
    expect((fetched as any).subject).toContain('updated subject');
    expect((fetched as any).content).toContain('initial body');
  });

  it('set_message_status: trashed', async () => {
    await ctx.client.setRecordingStatus(ctx.projectId, messageId, 'trashed');
    const fetched = await ctx.client.getMessage(ctx.projectId, messageId);
    expect((fetched as any).status).toBe('trashed');
  });

  it('set_message_status: idempotent', async () => {
    await expect(
      ctx.client.setRecordingStatus(ctx.projectId, messageId, 'trashed'),
    ).resolves.not.toThrow();
  });
});
