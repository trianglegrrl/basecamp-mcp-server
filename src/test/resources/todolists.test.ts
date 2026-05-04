import { describe, it, expect, vi } from 'vitest';
import { getTodolist, createTodolist, updateTodolist } from '../../lib/resources/todolists.js';
import type { AxiosInstance } from 'axios';

function makeMockClient() {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>;
  };
}

describe('todolists resource', () => {
  describe('getTodolist', () => {
    it('GETs /buckets/{p}/todolists/{id}.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '50', name: 'My list' } });
      const result = await getTodolist(client, '100', '50');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/todolists/50.json');
      expect(result.name).toBe('My list');
    });
  });

  describe('createTodolist', () => {
    it('POSTs body to /buckets/{p}/todosets/{ts}/todolists.json', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '50', name: 'New' } });
      await createTodolist(client, '100', '5', { name: 'New', description: '<em>go</em>' });
      expect(client.post).toHaveBeenCalledWith(
        '/buckets/100/todosets/5/todolists.json',
        { name: 'New', description: '<em>go</em>' },
      );
    });
  });

  describe('updateTodolist', () => {
    it("uses 'full' strategy: GET then PUT with whitelisted union", async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({
        data: { id: '50', name: 'old', description: 'desc' },
      });
      client.put.mockResolvedValue({ data: { id: '50', name: 'new', description: 'desc' } });

      await updateTodolist(client, '100', '50', { name: 'new' });

      expect(client.get).toHaveBeenCalledWith('/buckets/100/todolists/50.json');
      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/todolists/50.json',
        { name: 'new', description: 'desc' },
      );
    });
  });
});
