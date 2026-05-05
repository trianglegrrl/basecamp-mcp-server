import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/documents.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(overrides: Partial<BasecampClient> = {}): BasecampClient {
  return {
    getDocuments: vi.fn(),
    createDocument: vi.fn(),
    updateDocument: vi.fn(),
    trashDocument: vi.fn(),
    getUploads: vi.fn(),
    ...overrides,
  } as unknown as BasecampClient;
}

describe('documents handlers', () => {
  it('get_documents: forwards (project_id, vault_id) and returns count', async () => {
    const client = makeMockClient();
    (client.getDocuments as any).mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const result = await handlers.get_documents({ project_id: '100', vault_id: '50' }, client);
    expect(client.getDocuments).toHaveBeenCalledWith('100', '50');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.documents).toHaveLength(2);
    expect(parsed.count).toBe(2);
  });

  it('create_document: forwards (project_id, vault_id, title, content)', async () => {
    const client = makeMockClient();
    (client.createDocument as any).mockResolvedValue({ id: '7', title: 'Doc' });
    const result = await handlers.create_document(
      { project_id: '100', vault_id: '50', title: 'Doc', content: '<p>hi</p>' },
      client,
    );
    expect(client.createDocument).toHaveBeenCalledWith('100', '50', 'Doc', '<p>hi</p>');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.document.id).toBe('7');
  });

  it('update_document (wire-up fix): forwards optional title/content', async () => {
    const client = makeMockClient();
    (client.updateDocument as any).mockResolvedValue({ id: '7', title: 'New' });
    const result = await handlers.update_document(
      { project_id: '100', document_id: '7', title: 'New', content: '<p>updated</p>' },
      client,
    );
    expect(client.updateDocument).toHaveBeenCalledWith('100', '7', 'New', '<p>updated</p>');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.document.id).toBe('7');
  });

  it('trash_document (wire-up fix): forwards (project_id, document_id)', async () => {
    const client = makeMockClient();
    (client.trashDocument as any).mockResolvedValue(undefined);
    const result = await handlers.trash_document({ project_id: '100', document_id: '7' }, client);
    expect(client.trashDocument).toHaveBeenCalledWith('100', '7');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.message).toMatch(/trash/i);
  });

  it('get_uploads (wire-up fix): forwards optional vault_id', async () => {
    const client = makeMockClient();
    (client.getUploads as any).mockResolvedValue([{ id: 'u1' }]);
    const result = await handlers.get_uploads({ project_id: '100', vault_id: '50' }, client);
    expect(client.getUploads).toHaveBeenCalledWith('100', '50');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.uploads).toHaveLength(1);
    expect(parsed.count).toBe(1);
  });

  it('get_uploads (wire-up fix): omits vault_id when not provided', async () => {
    const client = makeMockClient();
    (client.getUploads as any).mockResolvedValue([]);
    await handlers.get_uploads({ project_id: '100' }, client);
    expect(client.getUploads).toHaveBeenCalledWith('100', undefined);
  });
});
