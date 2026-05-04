import { describe, it, expect, vi } from 'vitest';
import {
  getSchedule,
  getScheduleEntries,
  getScheduleEntry,
  createScheduleEntry,
  updateScheduleEntry,
} from '../../lib/resources/schedule.js';
import type { AxiosInstance } from 'axios';

function makeMockClient() {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>;
  };
}

describe('schedule resource', () => {
  describe('getSchedule', () => {
    it('uses the dock helper to fetch schedule details', async () => {
      const client = makeMockClient();
      client.get
        .mockResolvedValueOnce({
          data: { id: '100', dock: [{ id: '888', name: 'schedule', enabled: true }] },
        })
        .mockResolvedValueOnce({ data: { id: '888', title: 'Schedule' } });

      const result = await getSchedule(client, '100');
      expect(client.get).toHaveBeenNthCalledWith(1, '/projects/100.json');
      expect(client.get).toHaveBeenNthCalledWith(2, '/buckets/100/schedules/888.json');
      expect(result).toEqual({ id: '888', title: 'Schedule' });
    });
  });

  describe('getScheduleEntries', () => {
    it('GETs /buckets/{p}/schedules/{s}/entries.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: [{ id: '1' }] });
      await getScheduleEntries(client, '100', '888');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/schedules/888/entries.json');
    });
  });

  describe('getScheduleEntry', () => {
    it('GETs /buckets/{p}/schedule_entries/{id}.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '7' } });
      await getScheduleEntry(client, '100', '7');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/schedule_entries/7.json');
    });
  });

  describe('createScheduleEntry', () => {
    it('POSTs body to /buckets/{p}/schedules/{s}/entries.json', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '7', summary: 'Lunch' } });
      await createScheduleEntry(client, '100', '888', {
        summary: 'Lunch',
        starts_at: '2026-06-01T12:00:00Z',
        ends_at: '2026-06-01T13:00:00Z',
        all_day: false,
      });
      expect(client.post).toHaveBeenCalledWith(
        '/buckets/100/schedules/888/entries.json',
        {
          summary: 'Lunch',
          starts_at: '2026-06-01T12:00:00Z',
          ends_at: '2026-06-01T13:00:00Z',
          all_day: false,
        },
      );
    });
  });

  describe('updateScheduleEntry', () => {
    it("uses 'full' strategy: GET then PUT whitelisted union", async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({
        data: {
          id: '7',
          summary: 'old',
          description: 'd',
          starts_at: '2026-06-01T12:00:00Z',
          ends_at: '2026-06-01T13:00:00Z',
          all_day: false,
          notify: false,
          participant_ids: [10],
        },
      });
      client.put.mockResolvedValue({ data: { id: '7' } });

      await updateScheduleEntry(client, '100', '7', { summary: 'new' });

      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/schedule_entries/7.json',
        {
          summary: 'new',
          description: 'd',
          starts_at: '2026-06-01T12:00:00Z',
          ends_at: '2026-06-01T13:00:00Z',
          participant_ids: [10],
          all_day: false,
          notify: false,
        },
      );
    });
  });
});
