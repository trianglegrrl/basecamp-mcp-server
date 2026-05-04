import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/recording-status.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(): BasecampClient {
  return { setRecordingStatus: vi.fn() } as unknown as BasecampClient;
}

const parse = (r: any) => JSON.parse(r.content[0].text);

describe('recording-status handlers', () => {
  const cases: Array<{ tool: keyof typeof handlers; idArg: string }> = [
    { tool: 'set_todo_status',           idArg: 'todo_id' },
    { tool: 'set_todolist_status',       idArg: 'todolist_id' },
    { tool: 'set_message_status',        idArg: 'message_id' },
    { tool: 'set_comment_status',        idArg: 'comment_id' },
    { tool: 'set_schedule_entry_status', idArg: 'entry_id' },
  ];

  for (const { tool, idArg } of cases) {
    it(`${tool}: forwards (project_id, ${idArg}, status)`, async () => {
      const c = makeMockClient();
      (c.setRecordingStatus as any).mockResolvedValue(undefined);
      const args: Record<string, any> = { project_id: '100', status: 'trashed' };
      args[idArg] = '7';
      const r = await handlers[tool](args, c);
      expect(c.setRecordingStatus).toHaveBeenCalledWith('100', '7', 'trashed');
      expect(parse(r).status).toBe('success');
    });
  }

  it('idempotent: a second trashed call also succeeds', async () => {
    const c = makeMockClient();
    (c.setRecordingStatus as any).mockResolvedValue(undefined);
    await handlers.set_todo_status({ project_id: '100', todo_id: '7', status: 'trashed' }, c);
    await handlers.set_todo_status({ project_id: '100', todo_id: '7', status: 'trashed' }, c);
    expect(c.setRecordingStatus).toHaveBeenCalledTimes(2);
  });
});
