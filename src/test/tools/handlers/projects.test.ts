import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/projects.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(): BasecampClient {
  return {
    createProject: vi.fn(),
    updateProject: vi.fn(),
    trashProject: vi.fn(),
    updateProjectAccess: vi.fn(),
  } as unknown as BasecampClient;
}

const parse = (r: { content: Array<{ text?: string }> }) =>
  JSON.parse((r.content[0] as { text: string }).text);

describe('projects handlers', () => {
  describe('create_project', () => {
    it('forwards body and returns the new project', async () => {
      const c = makeMockClient();
      (c.createProject as any).mockResolvedValue({ id: '999', name: 'Marketing Campaign' });
      const r = await handlers.create_project({ name: 'Marketing Campaign', description: 'Q4 push' }, c);
      expect(c.createProject).toHaveBeenCalledWith({ name: 'Marketing Campaign', description: 'Q4 push' });
      const parsed = parse(r);
      expect(parsed.status).toBe('success');
      expect(parsed.project.id).toBe('999');
      expect(parsed.message).toMatch(/Marketing Campaign/);
    });

    it('omits description when not provided', async () => {
      const c = makeMockClient();
      (c.createProject as any).mockResolvedValue({ id: '999' });
      await handlers.create_project({ name: 'Bare project' }, c);
      expect(c.createProject).toHaveBeenCalledWith({ name: 'Bare project' });
    });
  });

  describe('update_project', () => {
    it('forwards patch fields', async () => {
      const c = makeMockClient();
      (c.updateProject as any).mockResolvedValue({ id: '999', description: 'new' });
      await handlers.update_project({ project_id: '999', description: 'new' }, c);
      expect(c.updateProject).toHaveBeenCalledWith('999', { description: 'new' });
    });

    it('forwards admissions + schedule_attributes', async () => {
      const c = makeMockClient();
      (c.updateProject as any).mockResolvedValue({ id: '999' });
      await handlers.update_project({
        project_id: '999',
        admissions: 'team',
        schedule_attributes: { start_date: '2026-01-01', end_date: '2026-04-01' },
      }, c);
      expect(c.updateProject).toHaveBeenCalledWith('999', {
        admissions: 'team',
        schedule_attributes: { start_date: '2026-01-01', end_date: '2026-04-01' },
      });
    });
  });

  describe('trash_project', () => {
    it('forwards project_id and returns success', async () => {
      const c = makeMockClient();
      (c.trashProject as any).mockResolvedValue(undefined);
      const r = await handlers.trash_project({ project_id: '999' }, c);
      expect(c.trashProject).toHaveBeenCalledWith('999');
      const parsed = parse(r);
      expect(parsed.status).toBe('success');
      expect(parsed.message).toMatch(/trash/i);
    });
  });

  describe('update_project_access', () => {
    it('forwards grant/revoke/create payload', async () => {
      const c = makeMockClient();
      (c.updateProjectAccess as any).mockResolvedValue({
        granted: [{ id: 1049715915, name: 'Amy Rivera' }],
        revoked: [],
      });
      const r = await handlers.update_project_access({
        project_id: '999',
        grant: [1049715915],
        revoke: [1049715944],
        create: [{ name: 'Victor Copper', email_address: 'victor@hanchodesign.com' }],
      }, c);
      expect(c.updateProjectAccess).toHaveBeenCalledWith('999', {
        grant: [1049715915],
        revoke: [1049715944],
        create: [{ name: 'Victor Copper', email_address: 'victor@hanchodesign.com' }],
      });
      const parsed = parse(r);
      expect(parsed.status).toBe('success');
      expect(parsed.granted).toHaveLength(1);
    });

    it('rejects non-numeric grant ids at the schema layer', async () => {
      // Lesson learned from the cards/steps bug: BC3 silently drops
      // string IDs. For NEW tools we enforce numeric at the boundary.
      const c = makeMockClient();
      await expect(
        handlers.update_project_access({ project_id: '999', grant: ['1049715915'] }, c),
      ).rejects.toThrow(/Expected number/);
      expect(c.updateProjectAccess).not.toHaveBeenCalled();
    });

    it('forwards a grant-only request', async () => {
      const c = makeMockClient();
      (c.updateProjectAccess as any).mockResolvedValue({ granted: [], revoked: [] });
      await handlers.update_project_access({ project_id: '999', grant: [1049715915] }, c);
      expect(c.updateProjectAccess).toHaveBeenCalledWith('999', { grant: [1049715915] });
    });
  });
});
