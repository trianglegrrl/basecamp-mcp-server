import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/columns.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(overrides: Partial<BasecampClient> = {}): BasecampClient {
  return {
    getCardTableWithDetails: vi.fn(),
    getColumns: vi.fn(),
    createColumn: vi.fn(),
    updateColumn: vi.fn(),
    moveColumn: vi.fn(),
    updateColumnColor: vi.fn(),
    ...overrides,
  } as unknown as BasecampClient;
}

describe('columns handlers', () => {
  it('get_card_table: uses getCardTableWithDetails (single call)', async () => {
    const client = makeMockClient();
    (client.getCardTableWithDetails as any).mockResolvedValue({ id: '50', title: 'Board' });
    const result = await handlers.get_card_table({ project_id: '100' }, client);
    expect(client.getCardTableWithDetails).toHaveBeenCalledWith('100');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.card_table).toEqual({ id: '50', title: 'Board' });
  });

  it('get_columns: forwards (project_id, card_table_id) and returns count', async () => {
    const client = makeMockClient();
    (client.getColumns as any).mockResolvedValue([{ id: '1' }]);
    const result = await handlers.get_columns({ project_id: '100', card_table_id: '50' }, client);
    expect(client.getColumns).toHaveBeenCalledWith('100', '50');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.columns).toHaveLength(1);
    expect(parsed.count).toBe(1);
  });

  it('create_column: forwards (project_id, card_table_id, title)', async () => {
    const client = makeMockClient();
    (client.createColumn as any).mockResolvedValue({ id: '99', title: 'Done' });
    const result = await handlers.create_column(
      { project_id: '100', card_table_id: '50', title: 'Done' },
      client,
    );
    expect(client.createColumn).toHaveBeenCalledWith('100', '50', 'Done');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.column.id).toBe('99');
  });

  it('update_column (wire-up fix): forwards (project_id, column_id, title)', async () => {
    const client = makeMockClient();
    (client.updateColumn as any).mockResolvedValue({ id: '5', title: 'New Title' });
    const result = await handlers.update_column(
      { project_id: '100', column_id: '5', title: 'New Title' },
      client,
    );
    expect(client.updateColumn).toHaveBeenCalledWith('100', '5', 'New Title');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.column.title).toBe('New Title');
  });

  it('move_column (wire-up fix, arg-order trap): client signature is (projectId, columnId, position, cardTableId)', async () => {
    const client = makeMockClient();
    (client.moveColumn as any).mockResolvedValue(undefined);
    await handlers.move_column(
      { project_id: '100', card_table_id: '50', column_id: '5', position: 3 },
      client,
    );
    // Map by name, not by tool input order:
    expect(client.moveColumn).toHaveBeenCalledWith('100', '5', 3, '50');
  });

  it('update_column_color (wire-up fix): forwards (project_id, column_id, color)', async () => {
    const client = makeMockClient();
    (client.updateColumnColor as any).mockResolvedValue({ id: '5', color: '#FF0000' });
    const result = await handlers.update_column_color(
      { project_id: '100', column_id: '5', color: '#FF0000' },
      client,
    );
    expect(client.updateColumnColor).toHaveBeenCalledWith('100', '5', '#FF0000');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.column.color).toBe('#FF0000');
  });
});
