import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/comments.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(): BasecampClient {
  return {
    getComment: vi.fn(),
    createComment: vi.fn(),
    updateComment: vi.fn(),
  } as unknown as BasecampClient;
}

const parse = (r: any) => JSON.parse(r.content[0].text);

describe('comments handlers', () => {
  it('get_comment: forwards (project_id, comment_id)', async () => {
    const c = makeMockClient();
    (c.getComment as any).mockResolvedValue({ id: '7', content: 'hi' });
    const r = await handlers.get_comment({ project_id: '100', comment_id: '7' }, c);
    expect(c.getComment).toHaveBeenCalledWith('100', '7');
    expect(parse(r).comment.id).toBe('7');
  });

  it('create_comment: forwards body', async () => {
    const c = makeMockClient();
    (c.createComment as any).mockResolvedValue({ id: '7', content: 'hello' });
    await handlers.create_comment(
      { project_id: '100', recording_id: '500', content: '<div>hello</div>' }, c,
    );
    expect(c.createComment).toHaveBeenCalledWith('100', '500', { content: '<div>hello</div>' });
  });

  it('update_comment: forwards patch', async () => {
    const c = makeMockClient();
    (c.updateComment as any).mockResolvedValue({ id: '7', content: 'updated' });
    await handlers.update_comment({ project_id: '100', comment_id: '7', content: 'updated' }, c);
    expect(c.updateComment).toHaveBeenCalledWith('100', '7', { content: 'updated' });
  });
});
