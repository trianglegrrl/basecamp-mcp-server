import { z } from 'zod';
import type { BasecampClient } from '../../lib/basecamp-client.js';
import type { MCPToolResultEnvelope } from '../result.js';
import { successResult } from '../result.js';

const ProjectIdArgs = z.object({ project_id: z.string() });

const CreateWebhookArgs = z.object({
  project_id: z.string(),
  payload_url: z.string(),
  types: z.array(z.string()).optional(),
});

const DeleteWebhookArgs = z.object({ project_id: z.string(), webhook_id: z.string() });

async function getWebhooks(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectIdArgs.parse(rawArgs);
  const webhooks = await c.getWebhooks(args.project_id);
  return successResult({ webhooks, count: webhooks.length });
}

async function createWebhook(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = CreateWebhookArgs.parse(rawArgs);
  const webhook = await c.createWebhook(args.project_id, args.payload_url, args.types);
  return successResult({ webhook, message: 'Webhook created' });
}

async function deleteWebhook(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = DeleteWebhookArgs.parse(rawArgs);
  await c.deleteWebhook(args.project_id, args.webhook_id);
  return successResult({ message: 'Webhook deleted' });
}

export const handlers = {
  get_webhooks: getWebhooks,
  create_webhook: createWebhook,
  delete_webhook: deleteWebhook,
} as const;
