import { describe, it, expect, vi } from 'vitest';
import { getComment, createComment, updateComment } from '../../lib/resources/comments.js';
import type { AxiosInstance } from 'axios';

function makeMockClient() {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>;
  };
}

describe('comments resource', () => {
  describe('getComment', () => {
    it('GETs /buckets/{p}/comments/{id}.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '7', content: 'hi' } });
      const result = await getComment(client, '100', '7');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/comments/7.json');
      expect(result.content).toBe('hi');
    });
  });

  describe('createComment', () => {
    it('POSTs body to /buckets/{p}/recordings/{r}/comments.json', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '7', content: 'hello' } });
      await createComment(client, '100', '500', { content: '<div>hello</div>' });
      expect(client.post).toHaveBeenCalledWith(
        '/buckets/100/recordings/500/comments.json',
        { content: '<div>hello</div>' },
      );
    });
  });

  describe('updateComment', () => {
    it("uses 'partial' strategy: PUTs only the patch and never GETs first", async () => {
      const client = makeMockClient();
      client.put.mockResolvedValue({ data: { id: '7', content: 'updated' } });
      await updateComment(client, '100', '7', { content: 'updated' });
      expect(client.get).not.toHaveBeenCalled();
      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/comments/7.json',
        { content: 'updated' },
      );
    });

    it('short-circuits to a no-op-style get when patch is empty (defensive)', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '7', content: 'unchanged' } });
      const result = await updateComment(client, '100', '7', {});
      expect(client.put).not.toHaveBeenCalled();
      expect(result.content).toBe('unchanged');
    });
  });
});
