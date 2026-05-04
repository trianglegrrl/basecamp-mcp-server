import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/schedule.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(): BasecampClient {
  return {
    getSchedule: vi.fn(),
    getScheduleEntries: vi.fn(),
    getScheduleEntry: vi.fn(),
    createScheduleEntry: vi.fn(),
    updateScheduleEntry: vi.fn(),
  } as unknown as BasecampClient;
}

const parse = (r: any) => JSON.parse(r.content[0].text);

describe('schedule handlers', () => {
  it('get_schedule: forwards (project_id)', async () => {
    const c = makeMockClient();
    (c.getSchedule as any).mockResolvedValue({ id: '888', title: 'Schedule' });
    const r = await handlers.get_schedule({ project_id: '100' }, c);
    expect(c.getSchedule).toHaveBeenCalledWith('100');
    expect(parse(r).schedule.title).toBe('Schedule');
  });

  it('get_schedule_entries: forwards (project_id, schedule_id) with count', async () => {
    const c = makeMockClient();
    (c.getScheduleEntries as any).mockResolvedValue([{ id: '1' }]);
    const r = await handlers.get_schedule_entries({ project_id: '100', schedule_id: '888' }, c);
    expect(c.getScheduleEntries).toHaveBeenCalledWith('100', '888');
    expect(parse(r).count).toBe(1);
  });

  it('get_schedule_entry: forwards (project_id, entry_id)', async () => {
    const c = makeMockClient();
    (c.getScheduleEntry as any).mockResolvedValue({ id: '7', summary: 'Lunch' });
    const r = await handlers.get_schedule_entry({ project_id: '100', entry_id: '7' }, c);
    expect(c.getScheduleEntry).toHaveBeenCalledWith('100', '7');
    expect(parse(r).schedule_entry.summary).toBe('Lunch');
  });

  it('create_schedule_entry: forwards body shape', async () => {
    const c = makeMockClient();
    (c.createScheduleEntry as any).mockResolvedValue({ id: '7', summary: 'Lunch' });
    await handlers.create_schedule_entry({
      project_id: '100',
      schedule_id: '888',
      summary: 'Lunch',
      starts_at: '2026-06-01T12:00:00Z',
      ends_at: '2026-06-01T13:00:00Z',
      description: '<em>noms</em>',
      participant_ids: [10],
      all_day: false,
      notify: true,
    }, c);
    expect(c.createScheduleEntry).toHaveBeenCalledWith('100', '888', {
      summary: 'Lunch',
      starts_at: '2026-06-01T12:00:00Z',
      ends_at: '2026-06-01T13:00:00Z',
      description: '<em>noms</em>',
      participant_ids: [10],
      all_day: false,
      notify: true,
    });
  });

  it('update_schedule_entry: forwards patch only', async () => {
    const c = makeMockClient();
    (c.updateScheduleEntry as any).mockResolvedValue({ id: '7', summary: 'Brunch' });
    await handlers.update_schedule_entry({
      project_id: '100', entry_id: '7', summary: 'Brunch',
    }, c);
    expect(c.updateScheduleEntry).toHaveBeenCalledWith('100', '7', { summary: 'Brunch' });
  });
});
