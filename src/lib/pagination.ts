export function parseNextLink(linkHeader?: string): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

type GetFn<T> = (url: string, config?: unknown) => Promise<{
  data: T | T[];
  headers?: Record<string, string | undefined>;
}>;

export async function walkPaginated<T>(
  get: GetFn<T>,
  firstUrl: string,
  config?: unknown,
): Promise<T[]> {
  const all: T[] = [];
  let response = config === undefined ? await get(firstUrl) : await get(firstUrl, config);
  while (true) {
    if (Array.isArray(response.data)) {
      all.push(...response.data);
    } else {
      all.push(response.data);
    }
    const linkHeader = response.headers?.link ?? response.headers?.Link;
    const next = parseNextLink(linkHeader);
    if (!next) break;
    response = await get(next);
  }
  return all;
}
