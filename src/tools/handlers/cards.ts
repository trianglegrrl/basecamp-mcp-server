import type { BasecampClient } from '../../lib/basecamp-client.js';
import type { MCPToolResultEnvelope } from '../result.js';
import { successResult } from '../result.js';

async function getCards(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const cards = await c.getCards(args.project_id, args.column_id);
  return successResult({ cards, count: cards.length });
}

async function createCard(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
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

async function getCard(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const card = await c.getCard(args.project_id, args.card_id);
  return successResult({ card });
}

async function updateCard(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
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

async function moveCard(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  await c.moveCard(args.project_id, args.card_id, args.column_id);
  return successResult({ message: `Card moved to column ${args.column_id}` });
}

async function completeCard(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  await c.completeCard(args.project_id, args.card_id);
  return successResult({ message: 'Card marked as complete' });
}

async function getCardSteps(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const steps = await c.getCardSteps(args.project_id, args.card_id);
  return successResult({ steps, count: steps.length });
}

async function createCardStep(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const step = await c.createCardStep(
    args.project_id,
    args.card_id,
    args.title,
    args.due_on,
    args.assignee_ids,
  );
  return successResult({ step, message: `Step '${args.title}' created successfully` });
}

async function completeCardStep(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
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
