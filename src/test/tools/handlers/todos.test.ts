import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/todos.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(): BasecampClient {
  return {
    getTodo: vi.fn(),
    createTodo: vi.fn(),
    updateTodo: vi.fn(),
    completeTodo: vi.fn(),
    uncompleteTodo: vi.fn(),
    repositionTodo: vi.fn(),
  } as unknown as BasecampClient;
}

function payload(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0].text);
}

describe('todos handlers', () => {
  it('get_todo: forwards (project_id, todo_id)', async () => {
    const client = makeMockClient();
    (client.getTodo as any).mockResolvedValue({ id: '1', content: 'x' });
    const r = await handlers.get_todo({ project_id: '100', todo_id: '1' }, client);
    expect(client.getTodo).toHaveBeenCalledWith('100', '1');
    expect(payload(r).status).toBe('success');
    expect(payload(r).todo.id).toBe('1');
  });

  it('create_todo: forwards body shape', async () => {
    const client = makeMockClient();
    (client.createTodo as any).mockResolvedValue({ id: '99' });
    await handlers.create_todo({
      project_id: '100',
      todolist_id: '50',
      content: 'New todo',
      description: '<em>x</em>',
      assignee_ids: [10, 20],
      due_on: '2026-09-01',
      notify: true,
    }, client);
    expect(client.createTodo).toHaveBeenCalledWith('100', '50', {
      content: 'New todo',
      description: '<em>x</em>',
      assignee_ids: [10, 20],
      completion_subscriber_ids: undefined,
      due_on: '2026-09-01',
      starts_on: undefined,
      notify: true,
    });
  });

  it('update_todo: forwards patch (only the supplied keys)', async () => {
    const client = makeMockClient();
    (client.updateTodo as any).mockResolvedValue({ id: '1', content: 'new' });
    await handlers.update_todo({ project_id: '100', todo_id: '1', content: 'new' }, client);
    expect(client.updateTodo).toHaveBeenCalledWith('100', '1', { content: 'new' });
  });

  it('complete_todo: dispatches and returns success', async () => {
    const client = makeMockClient();
    (client.completeTodo as any).mockResolvedValue(undefined);
    const r = await handlers.complete_todo({ project_id: '100', todo_id: '1' }, client);
    expect(client.completeTodo).toHaveBeenCalledWith('100', '1');
    expect(payload(r).status).toBe('success');
  });

  it('uncomplete_todo: dispatches and returns success', async () => {
    const client = makeMockClient();
    (client.uncompleteTodo as any).mockResolvedValue(undefined);
    await handlers.uncomplete_todo({ project_id: '100', todo_id: '1' }, client);
    expect(client.uncompleteTodo).toHaveBeenCalledWith('100', '1');
  });

  it('reposition_todo: forwards position and optional parent_id', async () => {
    const client = makeMockClient();
    (client.repositionTodo as any).mockResolvedValue(undefined);
    await handlers.reposition_todo({
      project_id: '100', todo_id: '1', position: 3, parent_id: '777',
    }, client);
    expect(client.repositionTodo).toHaveBeenCalledWith('100', '1', 3, '777');
  });
});
