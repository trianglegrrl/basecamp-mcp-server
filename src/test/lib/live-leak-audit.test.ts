import { describe, it, expect, vi } from 'vitest';
import { auditForLeaks, RECORDING_TYPES } from '../../lib/live-leak-audit.js';
import type { BasecampClient } from '../../lib/basecamp-client.js';

function makeMockClient(byType: Record<string, any[]>) {
  const c = {
    getRecordings: vi.fn(async (opts: any) => byType[opts.type] ?? []),
  } as any;
  return c as BasecampClient;
}

describe('auditForLeaks', () => {
  it('reports no leaks when no prefixed items remain active', async () => {
    const client = makeMockClient({
      Todo: [{ id: '1', content: 'a real one', status: 'active' }],
      Todolist: [], Message: [], Comment: [], 'Schedule::Entry': [],
    });
    const leaks = await auditForLeaks(client, '100', '[mcp-test-run-x]');
    expect(leaks).toEqual([]);
  });

  it('reports active prefixed items as leaks', async () => {
    const client = makeMockClient({
      Todo: [{ id: '7', content: '[mcp-test-run-x] forgot to trash', status: 'active' }],
      Todolist: [], Message: [], Comment: [], 'Schedule::Entry': [],
    });
    const leaks = await auditForLeaks(client, '100', '[mcp-test-run-x]');
    expect(leaks).toHaveLength(1);
    expect(leaks[0]).toMatchObject({ type: 'Todo', id: '7' });
  });

  it('iterates every recording type and aggregates leaks using the right field per type', async () => {
    const client = makeMockClient({
      Todo:              [{ id: '1', content: '[mcp-test-x] a', status: 'active' }],
      Todolist:          [{ id: '2', name:    '[mcp-test-x] b', status: 'active' }],
      Message:           [{ id: '3', subject: '[mcp-test-x] c', status: 'active' }],
      Comment:           [{ id: '4', content: '[mcp-test-x] d', status: 'active' }],
      'Schedule::Entry': [{ id: '5', summary: '[mcp-test-x] e', status: 'active' }],
    });
    const leaks = await auditForLeaks(client, '100', '[mcp-test-x]');
    expect(leaks).toHaveLength(5);
    expect(leaks.map((l) => l.type).sort()).toEqual(
      ['Comment', 'Message', 'Schedule::Entry', 'Todo', 'Todolist'],
    );
  });

  it("ignores fields that don't match the recording type (a Todo's `title` is not its label)", async () => {
    // Regression guard: titleOf used to conflate title/name/subject/summary/content
    // with ?? chaining, so a Todo with `title: '[prefix] X'` was reported even
    // though Todos use `content` for their user-facing label. This test
    // verifies the new switch-on-type behaviour does not.
    const client = makeMockClient({
      Todo: [{ id: '7', title: '[mcp-test-x] not actually a leak', content: 'innocent', status: 'active' }],
      Todolist: [], Message: [], Comment: [], 'Schedule::Entry': [],
    });
    const leaks = await auditForLeaks(client, '100', '[mcp-test-x]');
    expect(leaks).toEqual([]);
  });

  it('exports the canonical RECORDING_TYPES tuple per spec §5.2', () => {
    expect(RECORDING_TYPES).toEqual([
      'Todo', 'Todolist', 'Message', 'Comment', 'Schedule::Entry',
    ]);
  });
});
