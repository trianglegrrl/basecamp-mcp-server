import { z } from 'zod';
import type { BasecampClient } from '../../lib/basecamp-client.js';
import type { MCPToolResultEnvelope } from '../result.js';
import { successResult } from '../result.js';

const ProjectIdArgs = z.object({ project_id: z.string() });
const ProjectCardTableArgs = z.object({ project_id: z.string(), card_table_id: z.string() });

const CreateColumnArgs = z.object({
  project_id: z.string(),
  card_table_id: z.string(),
  title: z.string(),
});

const UpdateColumnArgs = z.object({
  project_id: z.string(),
  column_id: z.string(),
  title: z.string(),
});

const MoveColumnArgs = z.object({
  project_id: z.string(),
  card_table_id: z.string(),
  column_id: z.string(),
  position: z.number(),
});

const UpdateColumnColorArgs = z.object({
  project_id: z.string(),
  column_id: z.string(),
  color: z.string(),
});

async function getCardTable(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectIdArgs.parse(rawArgs);
  const card_table = await c.getCardTableWithDetails(args.project_id);
  return successResult({ card_table });
}

async function getColumns(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectCardTableArgs.parse(rawArgs);
  const columns = await c.getColumns(args.project_id, args.card_table_id);
  return successResult({ columns, count: columns.length });
}

async function createColumn(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = CreateColumnArgs.parse(rawArgs);
  const column = await c.createColumn(args.project_id, args.card_table_id, args.title);
  return successResult({ column, message: `Column '${args.title}' created successfully` });
}

async function updateColumn(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = UpdateColumnArgs.parse(rawArgs);
  const column = await c.updateColumn(args.project_id, args.column_id, args.title);
  return successResult({ column, message: 'Column updated' });
}

// Argument-ordering trap: client signature is (projectId, columnId, position, cardTableId).
// MCP tool input order is (project_id, card_table_id, column_id, position).
// Map by name, not by position.
async function moveColumn(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = MoveColumnArgs.parse(rawArgs);
  await c.moveColumn(args.project_id, args.column_id, args.position, args.card_table_id);
  return successResult({ message: `Column moved to position ${args.position}` });
}

async function updateColumnColor(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = UpdateColumnColorArgs.parse(rawArgs);
  const column = await c.updateColumnColor(args.project_id, args.column_id, args.color);
  return successResult({ column, message: `Column color updated to ${args.color}` });
}

export const handlers = {
  get_card_table: getCardTable,
  get_columns: getColumns,
  create_column: createColumn,
  update_column: updateColumn,
  move_column: moveColumn,
  update_column_color: updateColumnColor,
} as const;
