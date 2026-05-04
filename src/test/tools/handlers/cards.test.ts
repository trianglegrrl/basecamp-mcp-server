import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/cards.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(overrides: Partial<BasecampClient> = {}): BasecampClient {
  return {
    getCards: vi.fn(),
    createCard: vi.fn(),
    getCard: vi.fn(),
    updateCard: vi.fn(),
    moveCard: vi.fn(),
    completeCard: vi.fn(),
    getCardSteps: vi.fn(),
    createCardStep: vi.fn(),
    completeCardStep: vi.fn(),
    ...overrides,
  } as unknown as BasecampClient;
}

describe('cards handlers', () => {
  it('get_cards: forwards (project_id, column_id) and returns count', async () => {
    const client = makeMockClient();
    (client.getCards as any).mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const result = await handlers.get_cards({ project_id: '100', column_id: '5' }, client);
    expect(client.getCards).toHaveBeenCalledWith('100', '5');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.cards).toHaveLength(2);
    expect(parsed.count).toBe(2);
    expect(parsed.status).toBe('success');
  });

  it('create_card: forwards positional args and returns success', async () => {
    const client = makeMockClient();
    (client.createCard as any).mockResolvedValue({ id: '99', title: 'New' });
    const result = await handlers.create_card(
      { project_id: '100', column_id: '5', title: 'New', content: 'body', due_on: '2026-09-01', notify: true },
      client,
    );
    expect(client.createCard).toHaveBeenCalledWith('100', '5', 'New', 'body', '2026-09-01', true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.card.id).toBe('99');
    expect(parsed.message).toMatch(/New/);
  });

  it('create_card: defaults notify to false when omitted', async () => {
    const client = makeMockClient();
    (client.createCard as any).mockResolvedValue({ id: '99' });
    await handlers.create_card({ project_id: '100', column_id: '5', title: 'X' }, client);
    expect(client.createCard).toHaveBeenCalledWith('100', '5', 'X', undefined, undefined, false);
  });

  it('get_card (wire-up fix): GETs the card by id', async () => {
    const client = makeMockClient();
    (client.getCard as any).mockResolvedValue({ id: '7' });
    const result = await handlers.get_card({ project_id: '100', card_id: '7' }, client);
    expect(client.getCard).toHaveBeenCalledWith('100', '7');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.card.id).toBe('7');
  });

  it('update_card (wire-up fix): forwards optional fields', async () => {
    const client = makeMockClient();
    (client.updateCard as any).mockResolvedValue({ id: '7', title: 'updated' });
    await handlers.update_card(
      { project_id: '100', card_id: '7', title: 'updated', content: 'new body', due_on: '2026-10-01', assignee_ids: ['1', '2'] },
      client,
    );
    expect(client.updateCard).toHaveBeenCalledWith('100', '7', 'updated', 'new body', '2026-10-01', ['1', '2']);
  });

  it('move_card: forwards (project_id, card_id, column_id)', async () => {
    const client = makeMockClient();
    (client.moveCard as any).mockResolvedValue(undefined);
    const result = await handlers.move_card({ project_id: '100', card_id: '7', column_id: '8' }, client);
    expect(client.moveCard).toHaveBeenCalledWith('100', '7', '8');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.message).toMatch(/8/);
  });

  it('complete_card: forwards (project_id, card_id)', async () => {
    const client = makeMockClient();
    (client.completeCard as any).mockResolvedValue(undefined);
    const result = await handlers.complete_card({ project_id: '100', card_id: '7' }, client);
    expect(client.completeCard).toHaveBeenCalledWith('100', '7');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.message).toMatch(/complete/);
  });

  it('get_card_steps: forwards (project_id, card_id) and returns count', async () => {
    const client = makeMockClient();
    (client.getCardSteps as any).mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
    const result = await handlers.get_card_steps({ project_id: '100', card_id: '7' }, client);
    expect(client.getCardSteps).toHaveBeenCalledWith('100', '7');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.steps).toHaveLength(2);
    expect(parsed.count).toBe(2);
  });

  it('create_card_step: forwards positional args', async () => {
    const client = makeMockClient();
    (client.createCardStep as any).mockResolvedValue({ id: 'a', title: 'Step' });
    await handlers.create_card_step(
      { project_id: '100', card_id: '7', title: 'Step', due_on: '2026-09-01', assignee_ids: ['1'] },
      client,
    );
    expect(client.createCardStep).toHaveBeenCalledWith('100', '7', 'Step', '2026-09-01', ['1']);
  });

  it('complete_card_step: forwards (project_id, step_id)', async () => {
    const client = makeMockClient();
    (client.completeCardStep as any).mockResolvedValue(undefined);
    const result = await handlers.complete_card_step({ project_id: '100', step_id: 'a' }, client);
    expect(client.completeCardStep).toHaveBeenCalledWith('100', 'a');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.message).toMatch(/complete/);
  });
});
