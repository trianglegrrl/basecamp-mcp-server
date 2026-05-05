import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { assertSandbox } from '../../lib/live-sandbox-guard.js';

const originalEnv = { ...process.env };

beforeEach(() => {
  delete process.env.BASECAMP_TEST_PROJECT_ID;
  delete process.env.BASECAMP_TEST_PROJECT_NAME_GUARD;
});
afterEach(() => {
  process.env = { ...originalEnv };
});

function makeClient(projectName: string) {
  return {
    getProject: vi.fn().mockResolvedValue({ id: '100', name: projectName }),
  } as any;
}

describe('assertSandbox', () => {
  it('throws when BASECAMP_TEST_PROJECT_ID is unset', async () => {
    await expect(assertSandbox(makeClient('whatever'))).rejects.toThrow(
      /BASECAMP_TEST_PROJECT_ID is not set/,
    );
  });

  it('throws when project name lacks the default sentinel MCP_TEST_SANDBOX', async () => {
    process.env.BASECAMP_TEST_PROJECT_ID = '100';
    const c = makeClient('Production Marketing Site');
    await expect(assertSandbox(c)).rejects.toThrow(
      /does not contain the sandbox sentinel/,
    );
  });

  it('passes when project name contains MCP_TEST_SANDBOX', async () => {
    process.env.BASECAMP_TEST_PROJECT_ID = '100';
    const c = makeClient('MCP_TEST_SANDBOX project');
    const id = await assertSandbox(c);
    expect(id).toBe('100');
  });

  it('honours BASECAMP_TEST_PROJECT_NAME_GUARD override', async () => {
    process.env.BASECAMP_TEST_PROJECT_ID = '100';
    process.env.BASECAMP_TEST_PROJECT_NAME_GUARD = 'CUSTOM_GUARD';
    const c = makeClient('contains CUSTOM_GUARD here');
    const id = await assertSandbox(c);
    expect(id).toBe('100');
  });
});
