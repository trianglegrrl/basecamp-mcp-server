export function parseNextLink(linkHeader?: string): string | null {
  if (!linkHeader) return null;
  const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
  return match ? match[1] : null;
}

type GetFn = (url: string, config?: unknown) => Promise<{ data: any; headers?: Record<string, any> }>;

export async function walkPaginated<T = any>(
  get: GetFn,
  firstUrl: string,
  config?: unknown,
): Promise<T[]> {
  const all: T[] = [];
  let response = config === undefined ? await get(firstUrl) : await get(firstUrl, config);
  while (true) {
    if (Array.isArray(response.data)) {
      all.push(...(response.data as T[]));
    } else {
      all.push(response.data as T);
    }
    const linkHeader = response.headers?.link ?? response.headers?.Link;
    const next = parseNextLink(linkHeader);
    if (!next) break;
    response = await get(next);
  }
  return all;
}
