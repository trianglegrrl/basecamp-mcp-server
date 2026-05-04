export interface MCPToolResultEnvelope {
  content: Array<{ type: 'text'; text: string }>;
}

export function successResult(payload: Record<string, unknown>): MCPToolResultEnvelope {
  const body = { ...payload, status: 'success' };
  return {
    content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
  };
}

export function errorResult(
  message: string,
  extra: Record<string, unknown> = {},
): MCPToolResultEnvelope {
  const body = { ...extra, status: 'error', message };
  return {
    content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
  };
}
