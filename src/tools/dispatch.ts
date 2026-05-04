import type { BasecampClient } from '../lib/basecamp-client.js';
import { errorResult, type MCPToolResultEnvelope } from './result.js';
import { handlers as cards } from './handlers/cards.js';
import { handlers as columns } from './handlers/columns.js';
import { handlers as documents } from './handlers/documents.js';
import { handlers as webhooks } from './handlers/webhooks.js';
import { handlers as misc } from './handlers/misc.js';
import { handlers as todos } from './handlers/todos.js';
import { handlers as todolists } from './handlers/todolists.js';

type Handler = (args: Record<string, any>, client: BasecampClient) => Promise<MCPToolResultEnvelope>;

const ALL_HANDLERS: Record<string, Handler> = {
  ...cards,
  ...columns,
  ...documents,
  ...webhooks,
  ...misc,
  ...todos,
  ...todolists,
};

export async function dispatch(
  name: string,
  args: Record<string, any>,
  client: BasecampClient,
): Promise<MCPToolResultEnvelope> {
  const handler = ALL_HANDLERS[name];
  if (!handler) return errorResult(`Unknown tool: ${name}`);
  try {
    return await handler(args, client);
  } catch (error: any) {
    if (error.response?.status === 401 && error.response?.data?.error?.includes('expired')) {
      return errorResult('Your Basecamp OAuth token has expired. Please re-authenticate: npm run auth', {
        error: 'OAuth token expired',
      });
    }
    if (error.response?.status === 422) {
      return errorResult(error.response?.data?.error ?? error.message, {
        error: 'Validation error',
        status: 422,
      });
    }
    return errorResult(error.message ?? 'Unknown error', { error: 'Execution error' });
  }
}
