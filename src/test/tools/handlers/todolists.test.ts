import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/todolists.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(): BasecampClient {
  return {
    getTodolist: vi.fn(),
    createTodolist: vi.fn(),
    updateTodolist: vi.fn(),
  } as unknown as BasecampClient;
}

const parse = (r: any) => JSON.parse(r.content[0].text);

describe('todolists handlers', () => {
  it('get_todolist: forwards (project_id, todolist_id)', async () => {
    const c = makeMockClient();
    (c.getTodolist as any).mockResolvedValue({ id: '50', name: 'List' });
    const r = await handlers.get_todolist({ project_id: '100', todolist_id: '50' }, c);
    expect(c.getTodolist).toHaveBeenCalledWith('100', '50');
    expect(parse(r).todolist.name).toBe('List');
  });

  it('create_todolist: forwards body', async () => {
    const c = makeMockClient();
    (c.createTodolist as any).mockResolvedValue({ id: '50', name: 'New' });
    await handlers.create_todolist(
      { project_id: '100', todoset_id: '5', name: 'New', description: '<em>x</em>' }, c,
    );
    expect(c.createTodolist).toHaveBeenCalledWith('100', '5', {
      name: 'New', description: '<em>x</em>',
    });
  });

  it('update_todolist: forwards patch', async () => {
    const c = makeMockClient();
    (c.updateTodolist as any).mockResolvedValue({ id: '50', name: 'Renamed' });
    await handlers.update_todolist({ project_id: '100', todolist_id: '50', name: 'Renamed' }, c);
    expect(c.updateTodolist).toHaveBeenCalledWith('100', '50', { name: 'Renamed' });
  });
});
