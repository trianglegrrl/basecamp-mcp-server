import { describe, it, expect, vi } from 'vitest';
import { dispatch } from '../../tools/dispatch.js';

describe('dispatch', () => {
  it('routes a known tool name to the registered handler', async () => {
    const client = { getProjects: vi.fn().mockResolvedValue([{ id: '1' }]) } as any;
    const result = await dispatch('get_projects', {}, client);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(client.getProjects).toHaveBeenCalledOnce();
  });

  it('returns an error envelope for an unknown tool name', async () => {
    const client = {} as any;
    const result = await dispatch('does_not_exist', {}, client);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.message).toMatch(/Unknown tool: does_not_exist/);
  });
});
