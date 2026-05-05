import { z } from 'zod';
import type { BasecampClient } from '../../lib/basecamp-client.js';
import type { MCPToolResultEnvelope } from '../result.js';
import { successResult } from '../result.js';

const ProjectCardArgs = z.object({ project_id: z.string(), card_id: z.string() });
const ProjectColumnArgs = z.object({ project_id: z.string(), column_id: z.string() });

const CreateCardArgs = z.object({
  project_id: z.string(),
  column_id: z.string(),
  title: z.string(),
  content: z.string().optional(),
  due_on: z.string().optional(),
  notify: z.boolean().optional(),
});

const UpdateCardArgs = z.object({
  project_id: z.string(),
  card_id: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
  due_on: z.string().optional(),
  assignee_ids: z.array(z.string()).optional(),
});

const MoveCardArgs = z.object({
  project_id: z.string(),
  card_id: z.string(),
  column_id: z.string(),
});

const CreateCardStepArgs = z.object({
  project_id: z.string(),
  card_id: z.string(),
  title: z.string(),
  due_on: z.string().optional(),
  assignee_ids: z.array(z.string()).optional(),
});

const CompleteCardStepArgs = z.object({ project_id: z.string(), step_id: z.string() });

async function getCards(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectColumnArgs.parse(rawArgs);
  const cards = await c.getCards(args.project_id, args.column_id);
  return successResult({ cards, count: cards.length });
}

async function createCard(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = CreateCardArgs.parse(rawArgs);
  const card = await c.createCard(
    args.project_id,
    args.column_id,
    args.title,
    args.content,
    args.due_on,
    args.notify ?? false,
  );
  return successResult({ card, message: `Card '${args.title}' created successfully` });
}

async function getCard(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectCardArgs.parse(rawArgs);
  const card = await c.getCard(args.project_id, args.card_id);
  return successResult({ card });
}

async function updateCard(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = UpdateCardArgs.parse(rawArgs);
  const card = await c.updateCard(
    args.project_id,
    args.card_id,
    args.title,
    args.content,
    args.due_on,
    args.assignee_ids,
  );
  return successResult({ card, message: 'Card updated' });
}

async function moveCard(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = MoveCardArgs.parse(rawArgs);
  await c.moveCard(args.project_id, args.card_id, args.column_id);
  return successResult({ message: `Card moved to column ${args.column_id}` });
}

async function completeCard(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectCardArgs.parse(rawArgs);
  await c.completeCard(args.project_id, args.card_id);
  return successResult({ message: 'Card marked as complete' });
}

async function getCardSteps(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectCardArgs.parse(rawArgs);
  const steps = await c.getCardSteps(args.project_id, args.card_id);
  return successResult({ steps, count: steps.length });
}

async function createCardStep(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = CreateCardStepArgs.parse(rawArgs);
  const step = await c.createCardStep(
    args.project_id,
    args.card_id,
    args.title,
    args.due_on,
    args.assignee_ids,
  );
  return successResult({ step, message: `Step '${args.title}' created successfully` });
}

async function completeCardStep(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = CompleteCardStepArgs.parse(rawArgs);
  await c.completeCardStep(args.project_id, args.step_id);
  return successResult({ message: 'Step marked as complete' });
}

export const handlers = {
  get_cards: getCards,
  create_card: createCard,
  get_card: getCard,
  update_card: updateCard,
  move_card: moveCard,
  complete_card: completeCard,
  get_card_steps: getCardSteps,
  create_card_step: createCardStep,
  complete_card_step: completeCardStep,
} as const;
