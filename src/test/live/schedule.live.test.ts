import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootstrapLive, afterAllLiveTests, type LiveContext } from './_setup.js';

let ctx: LiveContext;
let scheduleId: string;
const STARTS_AT = '2026-12-31T15:00:00Z';
const ENDS_AT = '2026-12-31T16:00:00Z';

beforeAll(async () => {
  ctx = await bootstrapLive();
  const schedule = await ctx.client.getSchedule(ctx.projectId);
  scheduleId = String((schedule as any).id);
});

afterAll(async () => {
  if (ctx) await afterAllLiveTests(ctx);
});

describe('schedule lifecycle (LIVE)', () => {
  let entryId: string;

  it('create_schedule_entry: creates a prefixed entry and records its ID', async () => {
    const created = await ctx.client.createScheduleEntry(ctx.projectId, scheduleId, {
      summary: `${ctx.prefix} create-then-trash`,
      starts_at: STARTS_AT,
      ends_at: ENDS_AT,
      description: 'initial description',
    });
    entryId = String((created as any).id);
    ctx.store.record({ recording_id: entryId, type: 'Schedule::Entry', project_id: ctx.projectId });
    expect((created as any).summary).toContain(ctx.prefix);
  });

  it('get_schedule_entry: round-trips the created fields', async () => {
    const fetched = await ctx.client.getScheduleEntry(ctx.projectId, entryId);
    expect((fetched as any).summary).toContain(ctx.prefix);
    expect((fetched as any).starts_at).toBe(STARTS_AT);
    expect((fetched as any).ends_at).toBe(ENDS_AT);
  });

  it("update_schedule_entry: 'full' merge preserves times while changing summary", async () => {
    await ctx.client.updateScheduleEntry(ctx.projectId, entryId, {
      summary: `${ctx.prefix} updated summary`,
    });
    const fetched = await ctx.client.getScheduleEntry(ctx.projectId, entryId);
    expect((fetched as any).summary).toContain('updated summary');
    expect((fetched as any).starts_at).toBe(STARTS_AT);
    expect((fetched as any).ends_at).toBe(ENDS_AT);
  });

  it('set_schedule_entry_status: trashed', async () => {
    await ctx.client.setRecordingStatus(ctx.projectId, entryId, 'trashed');
    const fetched = await ctx.client.getScheduleEntry(ctx.projectId, entryId);
    expect((fetched as any).status).toBe('trashed');
  });

  it('set_schedule_entry_status: idempotent', async () => {
    await expect(
      ctx.client.setRecordingStatus(ctx.projectId, entryId, 'trashed'),
    ).resolves.not.toThrow();
  });
});
