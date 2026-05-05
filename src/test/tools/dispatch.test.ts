import { describe, it, expect, vi } from 'vitest';
import { dispatch } from '../../tools/dispatch.js';

const parse = (r: { content: Array<{ text?: string }> }) =>
  JSON.parse((r.content[0] as { text: string }).text);

describe('dispatch', () => {
  it('routes a known tool name to the registered handler', async () => {
    const client = { getProjects: vi.fn().mockResolvedValue([{ id: '1' }]) } as any;
    const result = await dispatch('get_projects', {}, client);
    const parsed = parse(result);
    expect(parsed.status).toBe('success');
    expect(client.getProjects).toHaveBeenCalledOnce();
  });

  it('returns an error envelope for an unknown tool name', async () => {
    const client = {} as any;
    const result = await dispatch('does_not_exist', {}, client);
    const parsed = parse(result);
    expect(parsed.status).toBe('error');
    expect(parsed.error).toBe('unknown_tool');
    expect(parsed.message).toMatch(/Unknown tool: does_not_exist/);
  });

  it('returns a validation envelope when handler args fail zod', async () => {
    const client = { getCard: vi.fn() } as any;
    // get_card requires { project_id: string, card_id: string }; sending a number for card_id
    const result = await dispatch('get_card', { project_id: '100', card_id: 7 }, client);
    const parsed = parse(result);
    expect(parsed.status).toBe('error');
    expect(parsed.error).toBe('validation');
    expect(parsed.message).toMatch(/Invalid arguments for get_card/);
    expect(parsed.message).toMatch(/card_id/);
    expect(client.getCard).not.toHaveBeenCalled();
  });

  it('returns a validation envelope when required arg is missing', async () => {
    const client = { getProject: vi.fn() } as any;
    const result = await dispatch('get_project', {}, client);
    const parsed = parse(result);
    expect(parsed.status).toBe('error');
    expect(parsed.error).toBe('validation');
    expect(parsed.message).toMatch(/project_id/);
    expect(client.getProject).not.toHaveBeenCalled();
  });

  it('rejects an invalid status enum value at the schema layer', async () => {
    const client = { setRecordingStatus: vi.fn() } as any;
    const result = await dispatch(
      'set_todo_status',
      { project_id: '100', todo_id: '7', status: 'destroyed' },
      client,
    );
    const parsed = parse(result);
    expect(parsed.status).toBe('error');
    expect(parsed.error).toBe('validation');
    expect(client.setRecordingStatus).not.toHaveBeenCalled();
  });
});
