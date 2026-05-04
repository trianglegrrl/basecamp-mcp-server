import { describe, it, expect, vi } from 'vitest';
import { setRecordingStatus } from '../../lib/resources/recording-status.js';
import type { AxiosInstance } from 'axios';

function makeMockClient() {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance & {
    put: ReturnType<typeof vi.fn>;
  };
}

describe('setRecordingStatus', () => {
  it('PUTs /buckets/{p}/recordings/{id}/status/trashed.json for status=trashed', async () => {
    const client = makeMockClient();
    client.put.mockResolvedValue({ data: undefined });
    await setRecordingStatus(client, '100', '7', 'trashed');
    expect(client.put).toHaveBeenCalledWith('/buckets/100/recordings/7/status/trashed.json');
  });

  it('PUTs status/archived.json for status=archived', async () => {
    const client = makeMockClient();
    client.put.mockResolvedValue({ data: undefined });
    await setRecordingStatus(client, '100', '7', 'archived');
    expect(client.put).toHaveBeenCalledWith('/buckets/100/recordings/7/status/archived.json');
  });

  it('PUTs status/active.json for status=active (unarchive)', async () => {
    const client = makeMockClient();
    client.put.mockResolvedValue({ data: undefined });
    await setRecordingStatus(client, '100', '7', 'active');
    expect(client.put).toHaveBeenCalledWith('/buckets/100/recordings/7/status/active.json');
  });

  it('is idempotent: a second call with the same status sends the same PUT', async () => {
    const client = makeMockClient();
    client.put.mockResolvedValue({ data: undefined });
    await setRecordingStatus(client, '100', '7', 'trashed');
    await setRecordingStatus(client, '100', '7', 'trashed');
    expect(client.put).toHaveBeenCalledTimes(2);
    expect(client.put).toHaveBeenNthCalledWith(1, '/buckets/100/recordings/7/status/trashed.json');
    expect(client.put).toHaveBeenNthCalledWith(2, '/buckets/100/recordings/7/status/trashed.json');
  });
});
