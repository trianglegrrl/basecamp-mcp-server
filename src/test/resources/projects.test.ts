import { describe, it, expect, vi } from 'vitest';
import {
  createProject,
  updateProject,
  trashProject,
  updateProjectAccess,
} from '../../lib/resources/projects.js';
import type { AxiosInstance } from 'axios';

function makeMockClient() {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    put: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

describe('projects resource', () => {
  describe('createProject', () => {
    it('POSTs body to /projects.json', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '999', name: 'Marketing Campaign' } });
      const result = await createProject(client, { name: 'Marketing Campaign', description: 'Q4 push' });
      expect(client.post).toHaveBeenCalledWith('/projects.json', {
        name: 'Marketing Campaign',
        description: 'Q4 push',
      });
      expect(result.id).toBe('999');
    });

    it('creates with name only when description is omitted', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '999', name: 'Bare project' } });
      await createProject(client, { name: 'Bare project' });
      expect(client.post).toHaveBeenCalledWith('/projects.json', { name: 'Bare project' });
    });

    it('surfaces the BC3 free-plan error verbatim', async () => {
      const client = makeMockClient();
      const err: Error & { response?: { status: number; data?: unknown } } = new Error('Insufficient Storage');
      err.response = { status: 507, data: { error: 'The project limit for this account has been reached.' } };
      client.post.mockRejectedValue(err);
      await expect(createProject(client, { name: 'X' })).rejects.toThrow(/Insufficient Storage/);
    });
  });

  describe('updateProject', () => {
    it("uses 'full' strategy: GET then PUT preserves name when only description changes", async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({
        data: { id: '999', name: 'Existing name', description: 'old desc', dock: [] },
      });
      client.put.mockResolvedValue({ data: { id: '999', name: 'Existing name', description: 'new desc' } });

      await updateProject(client, '999', { description: 'new desc' });

      expect(client.get).toHaveBeenCalledWith('/projects/999.json');
      // The merge supplies `name` from the GET (BC3's PUT requires it).
      // admissions and schedule_attributes are absent from the GET, so
      // they're undefined here and JSON.stringify drops them on the wire.
      expect(client.put).toHaveBeenCalledWith('/projects/999.json', {
        name: 'Existing name',
        description: 'new desc',
        admissions: undefined,
        schedule_attributes: undefined,
      });
    });

    it('PUTs the patched name when supplied', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({
        data: { id: '999', name: 'Existing name', description: 'desc', dock: [] },
      });
      client.put.mockResolvedValue({ data: { id: '999', name: 'New name', description: 'desc' } });

      await updateProject(client, '999', { name: 'New name' });

      const sentBody = client.put.mock.calls[0][1];
      expect(sentBody.name).toBe('New name');
      expect(sentBody.description).toBe('desc');
    });

    it('PUTs nested schedule_attributes when supplied', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({
        data: { id: '999', name: 'Existing', description: 'desc', dock: [] },
      });
      client.put.mockResolvedValue({ data: { id: '999' } });

      await updateProject(client, '999', {
        schedule_attributes: { start_date: '2026-01-01', end_date: '2026-04-01' },
      });

      const sentBody = client.put.mock.calls[0][1];
      expect(sentBody.schedule_attributes).toEqual({
        start_date: '2026-01-01',
        end_date: '2026-04-01',
      });
    });

    it('PUTs admissions when supplied', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({
        data: { id: '999', name: 'Existing', description: 'desc', dock: [] },
      });
      client.put.mockResolvedValue({ data: { id: '999' } });

      await updateProject(client, '999', { admissions: 'team' });

      expect(client.put.mock.calls[0][1].admissions).toBe('team');
    });
  });

  describe('trashProject', () => {
    it('DELETEs /projects/{id}.json', async () => {
      const client = makeMockClient();
      client.delete.mockResolvedValue({ data: undefined });
      await trashProject(client, '999');
      expect(client.delete).toHaveBeenCalledWith('/projects/999.json');
    });
  });

  describe('updateProjectAccess', () => {
    it('PUTs grant/revoke/create body to /projects/{id}/people/users.json', async () => {
      const client = makeMockClient();
      client.put.mockResolvedValue({
        data: { granted: [{ id: 1049715915, name: 'Amy Rivera' }], revoked: [] },
      });
      const result = await updateProjectAccess(client, '999', {
        grant: [1049715915],
        revoke: [1049715944],
        create: [{ name: 'Victor Copper', email_address: 'victor@hanchodesign.com' }],
      });
      expect(client.put).toHaveBeenCalledWith('/projects/999/people/users.json', {
        grant: [1049715915],
        revoke: [1049715944],
        create: [{ name: 'Victor Copper', email_address: 'victor@hanchodesign.com' }],
      });
      expect(result.granted).toHaveLength(1);
    });

    it('forwards a grant-only request', async () => {
      const client = makeMockClient();
      client.put.mockResolvedValue({ data: { granted: [], revoked: [] } });
      await updateProjectAccess(client, '999', { grant: [1049715915] });
      expect(client.put).toHaveBeenCalledWith('/projects/999/people/users.json', { grant: [1049715915] });
    });

    it('forwards a revoke-only request', async () => {
      const client = makeMockClient();
      client.put.mockResolvedValue({ data: { granted: [], revoked: [] } });
      await updateProjectAccess(client, '999', { revoke: [1049715944] });
      expect(client.put).toHaveBeenCalledWith('/projects/999/people/users.json', { revoke: [1049715944] });
    });
  });
});
