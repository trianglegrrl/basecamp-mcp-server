import type { BasecampClient } from '../../lib/basecamp-client.js';
import type { MCPToolResultEnvelope } from '../result.js';
import { successResult } from '../result.js';

async function getWebhooks(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const webhooks = await c.getWebhooks(args.project_id);
  return successResult({ webhooks, count: webhooks.length });
}

async function createWebhook(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const webhook = await c.createWebhook(args.project_id, args.payload_url, args.types);
  return successResult({ webhook, message: 'Webhook created' });
}

async function deleteWebhook(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  await c.deleteWebhook(args.project_id, args.webhook_id);
  return successResult({ message: 'Webhook deleted' });
}

export const handlers = {
  get_webhooks: getWebhooks,
  create_webhook: createWebhook,
  delete_webhook: deleteWebhook,
} as const;
