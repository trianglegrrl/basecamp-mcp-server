import { describe, it, expect, vi } from 'vitest';
import { applyUpdate } from '../../lib/update-merge.js';

interface FixtureResource {
  id: string;
  created_at: string;
  content: string;
  description?: string;
  due_on?: string;
}

interface FixtureBody {
  content?: string;
  description?: string;
  due_on?: string;
}

const WHITELIST = ['content', 'description', 'due_on'] as const;

describe('applyUpdate', () => {
  describe('empty patch short-circuit', () => {
    it('returns fetched current and never PUTs when patch is empty', async () => {
      const fetchCurrent = vi.fn().mockResolvedValue({
        id: '1', created_at: 'x', content: 'old', description: 'd', due_on: '2026-01-01',
      } as FixtureResource);
      const put = vi.fn();
      const result = await applyUpdate<FixtureResource, FixtureBody>(
        'full', {}, fetchCurrent, put, WHITELIST,
      );
      expect(fetchCurrent).toHaveBeenCalledTimes(1);
      expect(put).not.toHaveBeenCalled();
      expect(result.content).toBe('old');
    });
  });

  describe("'partial' strategy", () => {
    it('PUTs only the patch and never GETs first', async () => {
      const fetchCurrent = vi.fn();
      const put = vi.fn().mockResolvedValue({
        id: '1', created_at: 'x', content: 'new',
      } as FixtureResource);
      const result = await applyUpdate<FixtureResource, FixtureBody>(
        'partial', { content: 'new' }, fetchCurrent, put, WHITELIST,
      );
      expect(fetchCurrent).not.toHaveBeenCalled();
      expect(put).toHaveBeenCalledWith({ content: 'new' });
      expect(result.content).toBe('new');
    });
  });

  describe("'full' strategy", () => {
    it('GETs current, overlays the patch, PUTs the whitelisted union', async () => {
      const fetchCurrent = vi.fn().mockResolvedValue({
        id: '1',
        created_at: 'x',
        content: 'old',
        description: 'old description',
        due_on: '2026-01-01',
      } as FixtureResource);
      const put = vi.fn().mockResolvedValue({
        id: '1', created_at: 'x', content: 'new', description: 'old description', due_on: '2026-01-01',
      } as FixtureResource);

      await applyUpdate<FixtureResource, FixtureBody>(
        'full', { content: 'new' }, fetchCurrent, put, WHITELIST,
      );

      expect(fetchCurrent).toHaveBeenCalledTimes(1);
      expect(put).toHaveBeenCalledWith({
        content: 'new',
        description: 'old description',
        due_on: '2026-01-01',
      });
    });

    it('omits read-only fields not in the whitelist (id, created_at)', async () => {
      const fetchCurrent = vi.fn().mockResolvedValue({
        id: '1',
        created_at: 'x',
        content: 'old',
      } as FixtureResource);
      const put = vi.fn().mockResolvedValue({} as FixtureResource);

      await applyUpdate<FixtureResource, FixtureBody>(
        'full', { content: 'new' }, fetchCurrent, put, WHITELIST,
      );

      const sentBody = put.mock.calls[0][0];
      expect(sentBody).not.toHaveProperty('id');
      expect(sentBody).not.toHaveProperty('created_at');
    });

    it('treats null in the patch as "leave alone" (uses existing value, per spec §3.3)', async () => {
      const fetchCurrent = vi.fn().mockResolvedValue({
        id: '1', created_at: 'x', content: 'old', description: 'keep me',
      } as FixtureResource);
      const put = vi.fn().mockResolvedValue({} as FixtureResource);

      // Pair the null with a real change so the full-merge codepath
      // actually executes (a patch of nulls alone is empty per §3.3
      // and short-circuits — that case is covered in the next test).
      await applyUpdate<FixtureResource, FixtureBody>(
        'full',
        { content: 'new', description: null as unknown as string },
        fetchCurrent,
        put,
        WHITELIST,
      );

      // Per spec §3.3: null is treated the same as undefined.
      // The helper strips null patch values before merging, so the
      // existing record's description survives unchanged in the PUT body.
      const sentBody = put.mock.calls[0][0];
      expect(sentBody.content).toBe('new');
      expect(sentBody.description).toBe('keep me');
    });

    it('treats a patch of all-null values as effectively empty (no PUT)', async () => {
      const fetchCurrent = vi.fn().mockResolvedValue({
        id: '1', created_at: 'x', content: 'old',
      } as FixtureResource);
      const put = vi.fn();

      await applyUpdate<FixtureResource, FixtureBody>(
        'full',
        { content: null as unknown as string, description: null as unknown as string },
        fetchCurrent,
        put,
        WHITELIST,
      );

      expect(put).not.toHaveBeenCalled();
      expect(fetchCurrent).toHaveBeenCalledTimes(1);
    });

    it('preserves omitted whitelisted fields from the existing record', async () => {
      const fetchCurrent = vi.fn().mockResolvedValue({
        id: '1',
        created_at: 'x',
        content: 'preserved content',
        description: 'preserved description',
        due_on: '2026-09-09',
      } as FixtureResource);
      const put = vi.fn().mockResolvedValue({} as FixtureResource);

      await applyUpdate<FixtureResource, FixtureBody>(
        'full', { due_on: '2027-01-01' }, fetchCurrent, put, WHITELIST,
      );

      expect(put).toHaveBeenCalledWith({
        content: 'preserved content',
        description: 'preserved description',
        due_on: '2027-01-01',
      });
    });
  });
});
