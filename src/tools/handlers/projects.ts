import { z } from 'zod';
import type { BasecampClient } from '../../lib/basecamp-client.js';
import { successResult, type MCPToolResultEnvelope } from '../result.js';

const CreateProjectArgs = z.object({
  name: z.string(),
  description: z.string().optional(),
});

const ScheduleAttributesSchema = z.object({
  start_date: z.string(),
  end_date: z.string(),
});

const UpdateProjectArgs = z.object({
  project_id: z.string(),
  name: z.string().optional(),
  description: z.string().optional(),
  admissions: z.enum(['invite', 'employee', 'team']).optional(),
  schedule_attributes: ScheduleAttributesSchema.optional(),
});

const TrashProjectArgs = z.object({ project_id: z.string() });

// Lesson from the card/step bug: BC3 silently drops string-typed
// person IDs. For this NEW tool, enforce numeric IDs at the MCP
// boundary so the failure is loud and at the right layer.
const PersonInputSchema = z.object({
  name: z.string(),
  email_address: z.string(),
  title: z.string().optional(),
  company_name: z.string().optional(),
});

const UpdateProjectAccessArgs = z.object({
  project_id: z.string(),
  grant: z.array(z.number()).optional(),
  revoke: z.array(z.number()).optional(),
  create: z.array(PersonInputSchema).optional(),
});

async function createProject(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = CreateProjectArgs.parse(rawArgs);
  const project = await c.createProject({
    name: args.name,
    description: args.description,
  });
  return successResult({ project, message: `Project '${args.name}' created` });
}

async function updateProject(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = UpdateProjectArgs.parse(rawArgs);
  const { project_id, ...patch } = args;
  const project = await c.updateProject(project_id, patch);
  return successResult({ project, message: 'Project updated' });
}

async function trashProject(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = TrashProjectArgs.parse(rawArgs);
  await c.trashProject(args.project_id);
  return successResult({ message: 'Project moved to trash (recoverable from BC3 UI for 30 days)' });
}

async function updateProjectAccess(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = UpdateProjectAccessArgs.parse(rawArgs);
  const body: { grant?: number[]; revoke?: number[]; create?: typeof args.create } = {};
  if (args.grant !== undefined) body.grant = args.grant;
  if (args.revoke !== undefined) body.revoke = args.revoke;
  if (args.create !== undefined) body.create = args.create;
  const result = await c.updateProjectAccess(args.project_id, body);
  return successResult({
    granted: result.granted,
    revoked: result.revoked,
    message: `Access updated: ${result.granted.length} granted, ${result.revoked.length} revoked`,
  });
}

export const handlers = {
  create_project: createProject,
  update_project: updateProject,
  trash_project: trashProject,
  update_project_access: updateProjectAccess,
} as const;
