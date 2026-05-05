import { ZodError } from 'zod';
import type { BasecampClient } from '../lib/basecamp-client.js';
import { errorResult, type MCPToolResultEnvelope } from './result.js';
import { handlers as cards } from './handlers/cards.js';
import { handlers as columns } from './handlers/columns.js';
import { handlers as documents } from './handlers/documents.js';
import { handlers as webhooks } from './handlers/webhooks.js';
import { handlers as misc } from './handlers/misc.js';
import { handlers as todos } from './handlers/todos.js';
import { handlers as todolists } from './handlers/todolists.js';
import { handlers as comments } from './handlers/comments.js';
import { handlers as recordingStatus } from './handlers/recording-status.js';
import { handlers as messages } from './handlers/messages.js';
import { handlers as schedule } from './handlers/schedule.js';

type Handler = (args: Record<string, unknown>, client: BasecampClient) => Promise<MCPToolResultEnvelope>;

const ALL_HANDLERS: Record<string, Handler> = {
  ...cards,
  ...columns,
  ...documents,
  ...webhooks,
  ...misc,
  ...todos,
  ...todolists,
  ...comments,
  ...recordingStatus,
  ...messages,
  ...schedule,
};

interface AxiosLikeError {
  response?: { status?: number; data?: { error?: unknown } };
  message?: string;
}

function asAxiosLikeError(e: unknown): AxiosLikeError {
  return (typeof e === 'object' && e !== null) ? (e as AxiosLikeError) : {};
}

export async function dispatch(
  name: string,
  args: Record<string, unknown>,
  client: BasecampClient,
): Promise<MCPToolResultEnvelope> {
  const handler = ALL_HANDLERS[name];
  if (!handler) return errorResult(`Unknown tool: ${name}`, { error: 'unknown_tool' });
  try {
    return await handler(args, client);
  } catch (raw: unknown) {
    if (raw instanceof ZodError) {
      const message = raw.issues
        .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
        .join('; ');
      return errorResult(`Invalid arguments for ${name}: ${message}`, { error: 'validation' });
    }
    const error = asAxiosLikeError(raw);
    const status = error.response?.status;
    // Any 401 from BC3 is auth-related — don't fingerprint the message body
    // (that string can change without notice and we'd silently downgrade
    // the envelope to "Unknown error").
    if (status === 401) {
      return errorResult(
        'Your Basecamp OAuth token is no longer valid. Please re-authenticate: npm run auth',
        { error: 'auth.expired', status: 401 },
      );
    }
    if (status === 422) {
      const message = typeof error.response?.data?.error === 'string'
        ? error.response.data.error
        : (error.message ?? 'Validation failed');
      return errorResult(message, { error: 'validation', status: 422 });
    }
    return errorResult(error.message ?? 'Unknown error', { error: 'execution' });
  }
}
