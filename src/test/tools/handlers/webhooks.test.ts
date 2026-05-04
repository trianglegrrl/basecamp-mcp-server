import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/webhooks.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(overrides: Partial<BasecampClient> = {}): BasecampClient {
  return {
    getWebhooks: vi.fn(),
    createWebhook: vi.fn(),
    deleteWebhook: vi.fn(),
    ...overrides,
  } as unknown as BasecampClient;
}

describe('webhooks handlers (wire-up fixes)', () => {
  it('get_webhooks: forwards (project_id), returns array + count', async () => {
    const client = makeMockClient();
    (client.getWebhooks as any).mockResolvedValue([{ id: 'w1' }, { id: 'w2' }]);
    const result = await handlers.get_webhooks({ project_id: '100' }, client);
    expect(client.getWebhooks).toHaveBeenCalledWith('100');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.webhooks).toHaveLength(2);
    expect(parsed.count).toBe(2);
  });

  it('create_webhook: forwards (project_id, payload_url, types)', async () => {
    const client = makeMockClient();
    (client.createWebhook as any).mockResolvedValue({ id: 'w1', payload_url: 'https://x' });
    const result = await handlers.create_webhook(
      { project_id: '100', payload_url: 'https://x', types: ['Comment', 'Todo'] },
      client,
    );
    expect(client.createWebhook).toHaveBeenCalledWith('100', 'https://x', ['Comment', 'Todo']);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.webhook.id).toBe('w1');
  });

  it('create_webhook: omits types when not provided', async () => {
    const client = makeMockClient();
    (client.createWebhook as any).mockResolvedValue({ id: 'w1' });
    await handlers.create_webhook({ project_id: '100', payload_url: 'https://x' }, client);
    expect(client.createWebhook).toHaveBeenCalledWith('100', 'https://x', undefined);
  });

  it('delete_webhook: forwards (project_id, webhook_id)', async () => {
    const client = makeMockClient();
    (client.deleteWebhook as any).mockResolvedValue(undefined);
    const result = await handlers.delete_webhook({ project_id: '100', webhook_id: 'w1' }, client);
    expect(client.deleteWebhook).toHaveBeenCalledWith('100', 'w1');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.message).toMatch(/delet/i);
  });
});
