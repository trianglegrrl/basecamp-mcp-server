import { describe, it, expect, vi } from 'vitest';
import {
  getTodo,
  createTodo,
  updateTodo,
  completeTodo,
  uncompleteTodo,
  repositionTodo,
} from '../../lib/resources/todos.js';
import type { AxiosInstance } from 'axios';

function makeMockClient(): AxiosInstance & {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
} {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  } as any;
}

describe('todos resource', () => {
  describe('getTodo', () => {
    it('GETs /buckets/{p}/todos/{id}.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '1', content: 'x' } });
      const result = await getTodo(client, '100', '1');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/todos/1.json');
      expect(result).toEqual({ id: '1', content: 'x' });
    });
  });

  describe('createTodo', () => {
    it('POSTs the body to /buckets/{p}/todolists/{tl}/todos.json', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '99', content: 'new' } });
      const result = await createTodo(client, '100', '50', { content: 'new', due_on: '2026-09-01' });
      expect(client.post).toHaveBeenCalledWith(
        '/buckets/100/todolists/50/todos.json',
        { content: 'new', due_on: '2026-09-01' },
      );
      expect(result.id).toBe('99');
    });
  });

  describe('updateTodo', () => {
    it("uses 'full' strategy: GETs current then PUTs whitelisted union", async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({
        data: {
          id: '1',
          content: 'old',
          description: 'desc',
          assignee_ids: [10],
          completion_subscriber_ids: [],
          due_on: '2026-01-01',
          starts_on: null,
          notify: false,
          created_at: 'x',
        },
      });
      client.put.mockResolvedValue({ data: { id: '1', content: 'new' } });

      await updateTodo(client, '100', '1', { content: 'new' });

      expect(client.get).toHaveBeenCalledWith('/buckets/100/todos/1.json');
      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/todos/1.json',
        {
          content: 'new',
          description: 'desc',
          assignee_ids: [10],
          completion_subscriber_ids: [],
          due_on: '2026-01-01',
          starts_on: null,
          notify: false,
        },
      );
    });

    it('skips PUT when patch is empty', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '1', content: 'old' } });
      await updateTodo(client, '100', '1', {});
      expect(client.put).not.toHaveBeenCalled();
    });
  });

  describe('completeTodo', () => {
    it('POSTs to /buckets/{p}/todos/{id}/completion.json', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: undefined });
      await completeTodo(client, '100', '1');
      expect(client.post).toHaveBeenCalledWith('/buckets/100/todos/1/completion.json');
    });
  });

  describe('uncompleteTodo', () => {
    it('DELETEs /buckets/{p}/todos/{id}/completion.json', async () => {
      const client = makeMockClient();
      client.delete.mockResolvedValue({ data: undefined });
      await uncompleteTodo(client, '100', '1');
      expect(client.delete).toHaveBeenCalledWith('/buckets/100/todos/1/completion.json');
    });
  });

  describe('repositionTodo', () => {
    it('PUTs {position} to /buckets/{p}/todos/{id}/position.json', async () => {
      const client = makeMockClient();
      client.put.mockResolvedValue({ data: undefined });
      await repositionTodo(client, '100', '1', 3);
      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/todos/1/position.json',
        { position: 3 },
      );
    });

    it('includes parent_id when provided', async () => {
      const client = makeMockClient();
      client.put.mockResolvedValue({ data: undefined });
      await repositionTodo(client, '100', '1', 1, '777');
      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/todos/1/position.json',
        { position: 1, parent_id: '777' },
      );
    });
  });
});
