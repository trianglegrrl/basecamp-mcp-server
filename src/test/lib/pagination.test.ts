import { describe, it, expect, vi } from 'vitest';
import { parseNextLink, walkPaginated } from '../../lib/pagination.js';

describe('parseNextLink', () => {
  it('returns the rel="next" URL when present', () => {
    const header = '<https://example.com/page2>; rel="next"';
    expect(parseNextLink(header)).toBe('https://example.com/page2');
  });

  it('returns the rel="next" URL when multiple links are present', () => {
    const header = '<https://example.com/page1>; rel="prev", <https://example.com/page3>; rel="next"';
    expect(parseNextLink(header)).toBe('https://example.com/page3');
  });

  it('returns null when no rel="next" link is present', () => {
    expect(parseNextLink('<https://example.com/page1>; rel="prev"')).toBeNull();
  });

  it('returns null when the header is undefined', () => {
    expect(parseNextLink(undefined)).toBeNull();
  });

  it('returns null when the header is an empty string', () => {
    expect(parseNextLink('')).toBeNull();
  });
});

describe('walkPaginated', () => {
  it('returns a single page of results when there is no next link', async () => {
    const get = vi.fn().mockResolvedValue({
      data: [{ id: 1 }, { id: 2 }],
      headers: {},
    });
    const result = await walkPaginated(get, '/items.json');
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/items.json');
  });

  it('walks every page and concatenates results', async () => {
    const get = vi.fn()
      .mockResolvedValueOnce({
        data: [{ id: 1 }],
        headers: { link: '<https://example.com/items.json?page=2>; rel="next"' },
      })
      .mockResolvedValueOnce({
        data: [{ id: 2 }],
        headers: { link: '<https://example.com/items.json?page=3>; rel="next"' },
      })
      .mockResolvedValueOnce({
        data: [{ id: 3 }],
        headers: {},
      });
    const result = await walkPaginated(get, '/items.json');
    expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
    expect(get).toHaveBeenCalledTimes(3);
    expect(get).toHaveBeenNthCalledWith(2, 'https://example.com/items.json?page=2');
    expect(get).toHaveBeenNthCalledWith(3, 'https://example.com/items.json?page=3');
  });

  it('honours the case-insensitive Link header (capital L)', async () => {
    const get = vi.fn()
      .mockResolvedValueOnce({
        data: [{ id: 1 }],
        headers: { Link: '<https://example.com/items.json?page=2>; rel="next"' },
      })
      .mockResolvedValueOnce({
        data: [{ id: 2 }],
        headers: {},
      });
    const result = await walkPaginated(get, '/items.json');
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    expect(get).toHaveBeenCalledTimes(2);
  });

  it('forwards optional axios config (params) on the first call only', async () => {
    const get = vi.fn().mockResolvedValue({ data: [], headers: {} });
    await walkPaginated(get, '/items.json', { params: { type: 'Todo' } });
    expect(get).toHaveBeenCalledWith('/items.json', { params: { type: 'Todo' } });
  });
});
