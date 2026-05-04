import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/messages.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(): BasecampClient {
  return {
    getMessageBoard: vi.fn(),
    getMessages: vi.fn(),
    getMessage: vi.fn(),
    createMessage: vi.fn(),
    updateMessage: vi.fn(),
  } as unknown as BasecampClient;
}

const parse = (r: any) => JSON.parse(r.content[0].text);

describe('messages handlers', () => {
  it('get_message_board: forwards (project_id)', async () => {
    const c = makeMockClient();
    (c.getMessageBoard as any).mockResolvedValue({ id: '999', title: 'Board' });
    const r = await handlers.get_message_board({ project_id: '100' }, c);
    expect(c.getMessageBoard).toHaveBeenCalledWith('100');
    expect(parse(r).message_board.title).toBe('Board');
  });

  it('get_messages: forwards (project_id, message_board_id) and includes count', async () => {
    const c = makeMockClient();
    (c.getMessages as any).mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const r = await handlers.get_messages({ project_id: '100', message_board_id: '999' }, c);
    expect(c.getMessages).toHaveBeenCalledWith('100', '999');
    expect(parse(r).count).toBe(2);
  });

  it('get_message: forwards (project_id, message_id)', async () => {
    const c = makeMockClient();
    (c.getMessage as any).mockResolvedValue({ id: '1', subject: 'Hi' });
    const r = await handlers.get_message({ project_id: '100', message_id: '1' }, c);
    expect(c.getMessage).toHaveBeenCalledWith('100', '1');
    expect(parse(r).message.subject).toBe('Hi');
  });

  it('create_message: forwards body (without status, which the resource layer adds)', async () => {
    const c = makeMockClient();
    (c.createMessage as any).mockResolvedValue({ id: '1', subject: 'Hi' });
    await handlers.create_message({
      project_id: '100',
      message_board_id: '999',
      subject: 'Hi',
      content: '<div>Hello</div>',
      category_id: 7,
      subscriptions: [10, 20],
    }, c);
    expect(c.createMessage).toHaveBeenCalledWith('100', '999', {
      subject: 'Hi',
      content: '<div>Hello</div>',
      category_id: 7,
      subscriptions: [10, 20],
    });
  });

  it('update_message: forwards patch only', async () => {
    const c = makeMockClient();
    (c.updateMessage as any).mockResolvedValue({ id: '1', subject: 'New' });
    await handlers.update_message({
      project_id: '100', message_id: '1', subject: 'New',
    }, c);
    expect(c.updateMessage).toHaveBeenCalledWith('100', '1', { subject: 'New' });
  });
});
