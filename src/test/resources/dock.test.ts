import { describe, it, expect, vi } from 'vitest';
import { getDockEntryWithDetails } from '../../lib/resources/dock.js';
import type { AxiosInstance } from 'axios';

function makeMockClient(
  responses: Record<string, any>,
): AxiosInstance {
  return {
    get: vi.fn(async (url: string) => {
      if (responses[url]) return { data: responses[url] };
      throw new Error(`Unexpected GET ${url}`);
    }),
  } as unknown as AxiosInstance;
}

describe('getDockEntryWithDetails', () => {
  it('fetches the project, finds the named dock entry, and fetches details', async () => {
    const client = makeMockClient({
      '/projects/123.json': {
        id: '123',
        dock: [
          { id: '999', name: 'message_board', enabled: true },
          { id: '888', name: 'schedule', enabled: true },
        ],
      },
      '/buckets/123/message_boards/999.json': { id: '999', title: 'Board' },
    });

    const result = await getDockEntryWithDetails<{ id: string; title: string }>(
      client,
      '123',
      'message_board',
      (projectId, entryId) => `/buckets/${projectId}/message_boards/${entryId}.json`,
    );

    expect(result).toEqual({ id: '999', title: 'Board' });
    expect(client.get).toHaveBeenCalledTimes(2);
    expect(client.get).toHaveBeenNthCalledWith(1, '/projects/123.json');
    expect(client.get).toHaveBeenNthCalledWith(2, '/buckets/123/message_boards/999.json');
  });

  it('throws a clear error when the named dock entry is missing', async () => {
    const client = makeMockClient({
      '/projects/123.json': {
        id: '123',
        dock: [{ id: '999', name: 'message_board', enabled: true }],
      },
    });

    await expect(
      getDockEntryWithDetails(
        client,
        '123',
        'schedule',
        (p, e) => `/buckets/${p}/schedules/${e}.json`,
      ),
    ).rejects.toThrow(/No schedule dock entry found for project 123/);
  });

  it('coerces non-string entry ids to string when building the details path', async () => {
    const client = makeMockClient({
      '/projects/123.json': {
        id: '123',
        dock: [{ id: 999, name: 'card_table', enabled: true }],
      },
      '/buckets/123/card_tables/999.json': { id: 999, title: 'Board' },
    });

    await getDockEntryWithDetails(
      client,
      '123',
      'card_table',
      (p, e) => `/buckets/${p}/card_tables/${e}.json`,
    );

    expect(client.get).toHaveBeenNthCalledWith(2, '/buckets/123/card_tables/999.json');
  });
});
