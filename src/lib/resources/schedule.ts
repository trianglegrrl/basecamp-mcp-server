import type { AxiosInstance } from 'axios';
import { applyUpdate } from '../update-merge.js';
import { getDockEntryWithDetails } from './dock.js';
import type {
  Schedule,
  ScheduleEntry,
  ScheduleEntryCreateBody,
  ScheduleEntryUpdateBody,
} from '../../types/basecamp.js';

const SCHEDULE_ENTRY_UPDATE_WHITELIST = [
  'summary',
  'description',
  'starts_at',
  'ends_at',
  'participant_ids',
  'all_day',
  'notify',
] as const satisfies ReadonlyArray<keyof ScheduleEntryUpdateBody & keyof ScheduleEntry>;

export async function getSchedule(
  client: AxiosInstance,
  projectId: string,
): Promise<Schedule> {
  return getDockEntryWithDetails<Schedule>(
    client,
    projectId,
    'schedule',
    (p, id) => `/buckets/${p}/schedules/${id}.json`,
  );
}

export async function getScheduleEntries(
  client: AxiosInstance,
  projectId: string,
  scheduleId: string,
): Promise<ScheduleEntry[]> {
  const response = await client.get(
    `/buckets/${projectId}/schedules/${scheduleId}/entries.json`,
  );
  return response.data;
}

export async function getScheduleEntry(
  client: AxiosInstance,
  projectId: string,
  entryId: string,
): Promise<ScheduleEntry> {
  const response = await client.get(`/buckets/${projectId}/schedule_entries/${entryId}.json`);
  return response.data;
}

export async function createScheduleEntry(
  client: AxiosInstance,
  projectId: string,
  scheduleId: string,
  body: ScheduleEntryCreateBody,
): Promise<ScheduleEntry> {
  const response = await client.post(
    `/buckets/${projectId}/schedules/${scheduleId}/entries.json`,
    body,
  );
  return response.data;
}

export async function updateScheduleEntry(
  client: AxiosInstance,
  projectId: string,
  entryId: string,
  patch: ScheduleEntryUpdateBody,
): Promise<ScheduleEntry> {
  return applyUpdate<ScheduleEntry, ScheduleEntryUpdateBody>(
    'full',
    patch,
    () => getScheduleEntry(client, projectId, entryId),
    async (body) => {
      const response = await client.put(
        `/buckets/${projectId}/schedule_entries/${entryId}.json`,
        body,
      );
      return response.data;
    },
    SCHEDULE_ENTRY_UPDATE_WHITELIST,
  );
}
