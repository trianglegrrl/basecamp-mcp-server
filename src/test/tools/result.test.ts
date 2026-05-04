import { describe, it, expect } from 'vitest';
import { successResult, errorResult } from '../../tools/result.js';

describe('successResult', () => {
  it('wraps the payload as a JSON-encoded text content block', () => {
    const result = successResult({ todo: { id: '1', content: 'x' } });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.todo).toEqual({ id: '1', content: 'x' });
  });

  it('always sets status: "success" even if the payload contains a status key', () => {
    const result = successResult({ status: 'something-else', other: 1 });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.other).toBe(1);
  });
});

describe('errorResult', () => {
  it('wraps an error message as a JSON-encoded text content block', () => {
    const result = errorResult('Something went wrong', { code: 'X' });
    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.message).toBe('Something went wrong');
    expect(parsed.code).toBe('X');
  });
});
