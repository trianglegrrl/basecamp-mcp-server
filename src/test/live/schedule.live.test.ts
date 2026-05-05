import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { bootstrapLive, afterAllLiveTests, type LiveContext } from './_setup.js';

let ctx: LiveContext;
let scheduleId: string;
const STARTS_AT = '2026-12-31T15:00:00Z';
const ENDS_AT = '2026-12-31T16:00:00Z';

beforeAll(async () => {
  ctx = await bootstrapLive();
  const r = await ctx.call('get_schedule', { project_id: ctx.projectId });
  const schedule = r.schedule as { id: string | number };
  scheduleId = String(schedule.id);
});

afterAll(async () => {
  if (ctx) await afterAllLiveTests(ctx);
});

describe('schedule lifecycle (LIVE, via dispatch)', () => {
  let entryId: string;

  it('create_schedule_entry: creates a prefixed entry and records its ID', async () => {
    const r = await ctx.call('create_schedule_entry', {
      project_id: ctx.projectId,
      schedule_id: scheduleId,
      summary: `${ctx.prefix} create-then-trash`,
      starts_at: STARTS_AT,
      ends_at: ENDS_AT,
      description: 'initial description',
    });
    const entry = r.schedule_entry as { id: string | number; summary: string };
    entryId = String(entry.id);
    ctx.store.record({ recording_id: entryId, type: 'Schedule::Entry', project_id: ctx.projectId });
    expect(entry.summary).toContain(ctx.prefix);
  });

  it('get_schedule_entry: round-trips the created fields', async () => {
    const r = await ctx.call('get_schedule_entry', {
      project_id: ctx.projectId, entry_id: entryId,
    });
    const entry = r.schedule_entry as { summary: string; starts_at: string; ends_at: string };
    expect(entry.summary).toContain(ctx.prefix);
    // BC3 returns ISO datetimes with ms precision; parse both sides for tolerance.
    expect(new Date(entry.starts_at).getTime()).toBe(new Date(STARTS_AT).getTime());
    expect(new Date(entry.ends_at).getTime()).toBe(new Date(ENDS_AT).getTime());
  });

  it("update_schedule_entry: 'full' merge preserves times while changing summary", async () => {
    await ctx.call('update_schedule_entry', {
      project_id: ctx.projectId, entry_id: entryId, summary: `${ctx.prefix} updated summary`,
    });
    const r = await ctx.call('get_schedule_entry', {
      project_id: ctx.projectId, entry_id: entryId,
    });
    const entry = r.schedule_entry as { summary: string; starts_at: string; ends_at: string };
    expect(entry.summary).toContain('updated summary');
    expect(new Date(entry.starts_at).getTime()).toBe(new Date(STARTS_AT).getTime());
    expect(new Date(entry.ends_at).getTime()).toBe(new Date(ENDS_AT).getTime());
  });

  it('set_schedule_entry_status: trashed', async () => {
    await ctx.call('set_schedule_entry_status', {
      project_id: ctx.projectId, entry_id: entryId, status: 'trashed',
    });
    const r = await ctx.call('get_schedule_entry', {
      project_id: ctx.projectId, entry_id: entryId,
    });
    expect((r.schedule_entry as { status: string }).status).toBe('trashed');
  });

  it('set_schedule_entry_status: idempotent', async () => {
    await expect(ctx.call('set_schedule_entry_status', {
      project_id: ctx.projectId, entry_id: entryId, status: 'trashed',
    })).resolves.toMatchObject({ status: 'success' });
  });
});
