import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// Aliased to the SDK's CallToolResult so MCPToolResultEnvelope-typed values
// round-trip cleanly through setRequestHandler(CallToolRequestSchema, ...)
// without manual casts. Runtime shape is unchanged: { content: [{ type: 'text', text: '...' }] }.
export type MCPToolResultEnvelope = CallToolResult;

/**
 * Canonical categorisation of error envelopes. The error string in an
 * envelope is part of the wire contract — having a typed union here means
 * adding a new category requires touching one place, and grep across the
 * repo finds every call site cleanly.
 */
export type ErrorCategory =
  | 'auth.required'
  | 'auth.expired'
  | 'validation'
  | 'unknown_tool'
  | 'execution';

export function successResult(payload: Record<string, unknown>): MCPToolResultEnvelope {
  const body = { ...payload, status: 'success' };
  return {
    content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
    isError: false,
  };
}

export function errorResult(
  message: string,
  extra: { error: ErrorCategory } & Record<string, unknown>,
): MCPToolResultEnvelope {
  const body = { ...extra, status: 'error', message };
  return {
    content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
    isError: true,
  };
}
