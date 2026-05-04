import type { BasecampClient } from '../../lib/basecamp-client.js';
import { successResult, type MCPToolResultEnvelope } from '../result.js';

async function getSchedule(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const schedule = await c.getSchedule(args.project_id);
  return successResult({ schedule });
}

async function getScheduleEntries(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const entries = await c.getScheduleEntries(args.project_id, args.schedule_id);
  return successResult({ schedule_entries: entries, count: entries.length });
}

async function getScheduleEntry(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const schedule_entry = await c.getScheduleEntry(args.project_id, args.entry_id);
  return successResult({ schedule_entry });
}

async function createScheduleEntry(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const schedule_entry = await c.createScheduleEntry(args.project_id, args.schedule_id, {
    summary: args.summary,
    starts_at: args.starts_at,
    ends_at: args.ends_at,
    description: args.description,
    participant_ids: args.participant_ids,
    all_day: args.all_day,
    notify: args.notify,
  });
  return successResult({ schedule_entry, message: `Schedule entry '${args.summary}' created` });
}

async function updateScheduleEntry(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const { project_id, entry_id, ...patch } = args;
  const schedule_entry = await c.updateScheduleEntry(project_id, entry_id, patch);
  return successResult({ schedule_entry, message: 'Schedule entry updated' });
}

export const handlers = {
  get_schedule: getSchedule,
  get_schedule_entries: getScheduleEntries,
  get_schedule_entry: getScheduleEntry,
  create_schedule_entry: createScheduleEntry,
  update_schedule_entry: updateScheduleEntry,
} as const;
