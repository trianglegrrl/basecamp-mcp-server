import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Aliased to the SDK's CallToolResult so MCPToolResultEnvelope-typed values
// round-trip cleanly through setRequestHandler(CallToolRequestSchema, ...)
// without manual casts. Runtime shape is unchanged: { content: [{ type: 'text', text: '...' }] }.
export type MCPToolResultEnvelope = CallToolResult;

export function successResult(payload: Record<string, unknown>): MCPToolResultEnvelope {
  const body = { ...payload, status: 'success' };
  return {
    content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
    isError: false,
  };
}

export function errorResult(
  message: string,
  extra: Record<string, unknown> = {},
): MCPToolResultEnvelope {
  const body = { ...extra, status: 'error', message };
  return {
    content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
    isError: true,
  };
}
