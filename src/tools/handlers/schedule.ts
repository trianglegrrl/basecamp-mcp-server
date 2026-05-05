import { z } from 'zod';
import type { BasecampClient } from '../../lib/basecamp-client.js';
import { successResult, type MCPToolResultEnvelope } from '../result.js';

const ProjectIdArgs = z.object({ project_id: z.string() });
const ProjectScheduleArgs = z.object({ project_id: z.string(), schedule_id: z.string() });
const ProjectEntryArgs = z.object({ project_id: z.string(), entry_id: z.string() });

const CreateScheduleEntryArgs = z.object({
  project_id: z.string(),
  schedule_id: z.string(),
  summary: z.string(),
  starts_at: z.string(),
  ends_at: z.string(),
  description: z.string().optional(),
  participant_ids: z.array(z.union([z.string(), z.number()])).optional(),
  all_day: z.boolean().optional(),
  notify: z.boolean().optional(),
});

const UpdateScheduleEntryArgs = z.object({
  project_id: z.string(),
  entry_id: z.string(),
  summary: z.string().optional(),
  description: z.string().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  participant_ids: z.array(z.union([z.string(), z.number()])).optional(),
  all_day: z.boolean().optional(),
  notify: z.boolean().optional(),
});

async function getSchedule(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectIdArgs.parse(rawArgs);
  const schedule = await c.getSchedule(args.project_id);
  return successResult({ schedule });
}

async function getScheduleEntries(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectScheduleArgs.parse(rawArgs);
  const entries = await c.getScheduleEntries(args.project_id, args.schedule_id);
  return successResult({ schedule_entries: entries, count: entries.length });
}

async function getScheduleEntry(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectEntryArgs.parse(rawArgs);
  const schedule_entry = await c.getScheduleEntry(args.project_id, args.entry_id);
  return successResult({ schedule_entry });
}

async function createScheduleEntry(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = CreateScheduleEntryArgs.parse(rawArgs);
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

async function updateScheduleEntry(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = UpdateScheduleEntryArgs.parse(rawArgs);
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
