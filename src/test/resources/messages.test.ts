import { describe, it, expect, vi } from 'vitest';
import {
  getMessageBoard,
  getMessages,
  getMessage,
  createMessage,
  updateMessage,
} from '../../lib/resources/messages.js';
import type { AxiosInstance } from 'axios';

function makeMockClient() {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>;
  };
}

describe('messages resource', () => {
  describe('getMessageBoard', () => {
    it('uses the dock helper to fetch the board details', async () => {
      const client = makeMockClient();
      client.get
        .mockResolvedValueOnce({
          data: { id: '100', dock: [{ id: '999', name: 'message_board', enabled: true }] },
        })
        .mockResolvedValueOnce({
          data: { id: '999', title: 'Board' },
        });

      const result = await getMessageBoard(client, '100');
      expect(client.get).toHaveBeenNthCalledWith(1, '/projects/100.json');
      expect(client.get).toHaveBeenNthCalledWith(2, '/buckets/100/message_boards/999.json');
      expect(result).toEqual({ id: '999', title: 'Board' });
    });
  });

  describe('getMessages', () => {
    it('GETs /buckets/{p}/message_boards/{mb}/messages.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: [{ id: '1' }] });
      const result = await getMessages(client, '100', '999');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/message_boards/999/messages.json');
      expect(result).toEqual([{ id: '1' }]);
    });
  });

  describe('getMessage', () => {
    it('GETs /buckets/{p}/messages/{id}.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '1' } });
      await getMessage(client, '100', '1');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/messages/1.json');
    });
  });

  describe('createMessage', () => {
    it("POSTs the body with status: 'active' always set", async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '1', subject: 'Hi' } });
      await createMessage(client, '100', '999', { subject: 'Hi', content: '<div>x</div>' });
      expect(client.post).toHaveBeenCalledWith(
        '/buckets/100/message_boards/999/messages.json',
        { subject: 'Hi', content: '<div>x</div>', status: 'active' },
      );
    });

    it('forwards optional category_id and subscriptions', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '1', subject: 'X' } });
      await createMessage(client, '100', '999', {
        subject: 'X',
        category_id: 7,
        subscriptions: [10, 20],
      });
      const sent = client.post.mock.calls[0][1];
      expect(sent.category_id).toBe(7);
      expect(sent.subscriptions).toEqual([10, 20]);
      expect(sent.status).toBe('active');
    });
  });

  describe('updateMessage', () => {
    it("uses 'full' strategy: GET then PUT whitelisted union", async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({
        data: { id: '1', subject: 'old', content: 'old c', category_id: 3 },
      });
      client.put.mockResolvedValue({ data: { id: '1', subject: 'new' } });

      await updateMessage(client, '100', '1', { subject: 'new' });

      expect(client.get).toHaveBeenCalledWith('/buckets/100/messages/1.json');
      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/messages/1.json',
        { subject: 'new', content: 'old c', category_id: 3 },
      );
    });
  });
});
