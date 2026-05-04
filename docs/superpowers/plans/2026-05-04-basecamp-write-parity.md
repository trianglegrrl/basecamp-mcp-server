# Basecamp MCP Write Parity — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring Basecamp 3 write parity (create / update / status-change) to the MCP server for todos, todolists, comments, messages, and schedule entries — without ever editing or deleting items the test suite did not create itself.

**Architecture:** Three layers, all split per resource for maintainability:
1. **HTTP client layer** — `src/lib/resources/*.ts` exports plain functions taking an axios instance; `BasecampClient` becomes a thin facade delegating to them. New helpers `update-merge.ts`, `pagination.ts`, and `dock.ts` extract patterns shared across resources.
2. **MCP tool layer** — `src/tools/{registrations,dispatch}.ts` plus `src/tools/handlers/*.ts` (one handler file per resource). The mega-switch in `src/index.ts` is dismantled.
3. **Test layer** — mocks for CI (one test file per resource module / handler module), plus a separate live-verification suite (`npm run test:live`) gated by sandbox-project-name guard with disk-persisted captured IDs for crash recovery.

**Tech stack:** TypeScript, axios, vitest, MCP SDK, dotenv. Node ≥18.

**Reference spec:** `docs/superpowers/specs/2026-05-04-basecamp-write-parity-design.md`

---

## Chunk 1: Foundation helpers

This chunk creates the shared utilities every later chunk depends on: pagination, the update-merge helper, the dock-entry helper, and the body-type definitions. No new MCP tools yet — purely infrastructure. All work is TDD: failing test, minimal impl, passing test, commit.

### Task 1.1: Set up new directory structure

**Files:**
- Create: `src/lib/resources/.gitkeep`
- Create: `src/tools/handlers/.gitkeep`
- Create: `src/test/lib/.gitkeep`
- Create: `src/test/resources/.gitkeep`
- Create: `src/test/tools/handlers/.gitkeep`

- [ ] **Step 1: Create the directories**

```bash
cd /Users/alaina/projects/basecamp-mcp-server
mkdir -p src/lib/resources src/tools/handlers src/test/lib src/test/resources src/test/tools/handlers
touch src/lib/resources/.gitkeep src/tools/handlers/.gitkeep src/test/lib/.gitkeep src/test/resources/.gitkeep src/test/tools/handlers/.gitkeep
```

- [ ] **Step 2: Verify the layout exists**

Run: `ls -d src/lib/resources src/tools src/tools/handlers src/test/lib src/test/resources src/test/tools src/test/tools/handlers`
Expected: each path printed on its own line with no error.

- [ ] **Step 3: Commit**

```bash
git add src/lib/resources/.gitkeep src/tools/handlers/.gitkeep src/test/lib/.gitkeep src/test/resources/.gitkeep src/test/tools/handlers/.gitkeep
git commit -m "chore: scaffold directory structure for write-parity work"
```

---

### Task 1.2: Define wire-body types in `src/types/basecamp.ts`

The merge helper needs a `TBody` type per updatable resource, separate from the full `TResource` type. Append the body types to the existing file (it's currently ~244 lines; this adds ~70 — well under the 800 cap).

**Files:**
- Modify: `src/types/basecamp.ts` (append after the existing `MyAssignmentsResponse` interface)

- [ ] **Step 1: Append the body types**

Append exactly this block to the end of `src/types/basecamp.ts`:

```ts
// -------------------------------------------------------------------
// Wire-body types for PUT/POST requests.
// Distinct from the full resource types (which carry server-set fields
// like id, created_at, creator, bucket). The update-merge helper uses
// these as the TBody parameter so the compiler can verify that
// whitelist names exist on both the body and the resource.
// -------------------------------------------------------------------

export interface TodoCreateBody {
  content: string;
  description?: string;
  assignee_ids?: Array<number | string>;
  completion_subscriber_ids?: Array<number | string>;
  due_on?: string;
  starts_on?: string;
  notify?: boolean;
}

export interface TodoUpdateBody {
  content?: string;
  description?: string;
  assignee_ids?: Array<number | string>;
  completion_subscriber_ids?: Array<number | string>;
  due_on?: string;
  starts_on?: string;
  notify?: boolean;
}

export interface TodolistCreateBody {
  name: string;
  description?: string;
}

export interface TodolistUpdateBody {
  name?: string;
  description?: string;
}

export interface CommentCreateBody {
  content: string;
}

export interface CommentUpdateBody {
  content?: string;
}

export interface MessageCreateBody {
  subject: string;
  status: 'active';
  content?: string;
  category_id?: number | string;
  subscriptions?: Array<number | string>;
}

export interface MessageUpdateBody {
  subject?: string;
  content?: string;
  category_id?: number | string;
}

export interface ScheduleEntryCreateBody {
  summary: string;
  starts_at: string;
  ends_at: string;
  description?: string;
  participant_ids?: Array<number | string>;
  all_day?: boolean;
  notify?: boolean;
}

export interface ScheduleEntryUpdateBody {
  summary?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  participant_ids?: Array<number | string>;
  all_day?: boolean;
  notify?: boolean;
}

export type RecordingStatus = 'active' | 'archived' | 'trashed';
```

Also extend the existing `Todo`, `TodoList`, `Comment`, `Message`, and add `ScheduleEntry` interfaces so the `keyof TBody & keyof TResource` constraint can find every body field on the resource. Locate each interface and add the missing fields:

In `Todo` (around line 50), after `todolist?: { id: string; name: string; }`:

```ts
  status?: string;
  content_type?: string;
  starts_on?: string;
  notify?: boolean;
  completion_subscriber_ids?: Array<number | string>;
  assignee_ids?: Array<number | string>;
  parent?: { id: string | number; title: string };
  bucket?: { id: string | number; name: string };
```

In `TodoList` (around line 39), after `project?: ProjectInfo;`:

```ts
  status?: string;
```

In `Message` (around line 119), after `category?: { id: string; name: string; };`:

```ts
  status?: string;
  category_id?: number | string;
  subscriptions?: Array<number | string>;
```

After the existing `Webhook` interface (around line 176), append:

```ts
export interface Schedule {
  id: string;
  title: string;
  entries_count?: number;
  status?: string;
}

export interface ScheduleEntry {
  id: string;
  summary: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  all_day?: boolean;
  notify?: boolean;
  participant_ids?: Array<number | string>;
  status?: string;
  created_at: string;
  updated_at: string;
  creator?: Person;
  bucket?: { id: string | number; name: string };
  parent?: { id: string | number; title: string };
}

export interface MessageBoard {
  id: string;
  title: string;
  status?: string;
}
```

- [ ] **Step 2: Verify TS still compiles**

Run: `npm run build`
Expected: Compiles with no errors. (The new types are additive; nothing references them yet.)

- [ ] **Step 3: Commit**

```bash
git add src/types/basecamp.ts
git commit -m "feat(types): add wire-body types for write-parity work"
```

---

### Task 1.3: Extract pagination to `src/lib/pagination.ts`

The existing `parseNextLink` helper lives at the top of `src/lib/basecamp-client.ts`. Extract it and add a `walkPaginated` utility that fully drains a paginated endpoint. The leak audit and other future callers will use `walkPaginated`.

**Files:**
- Create: `src/lib/pagination.ts`
- Create: `src/test/lib/pagination.test.ts`
- Modify: `src/lib/basecamp-client.ts` (remove the local `parseNextLink`, import from `./pagination.js`)

- [ ] **Step 1: Write the failing test**

Create `src/test/lib/pagination.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/lib/pagination.test.ts`
Expected: FAIL — `Cannot find module '../../lib/pagination.js'`.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/pagination.ts`:

```ts
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
  let response = await get(firstUrl, config);
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/lib/pagination.test.ts`
Expected: PASS — all 9 tests green (5 `parseNextLink` + 4 `walkPaginated`).

- [ ] **Step 5: Refactor `basecamp-client.ts` to use the extracted helper**

Open `src/lib/basecamp-client.ts`. Find lines 35-39 (the `parseNextLink` function) and delete them. Add at the top of the file (after the existing imports):

```ts
import { parseNextLink } from './pagination.js';
```

`getRecordingsTodos` (around line 204) already calls `parseNextLink` — that call now resolves to the imported version. No other change.

- [ ] **Step 6: Run the existing client tests to confirm no regression**

Run: `npx vitest run src/test/basecamp-client.test.ts`
Expected: PASS (whatever is currently green stays green).

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/pagination.ts src/test/lib/pagination.test.ts src/lib/basecamp-client.ts
git commit -m "refactor: extract pagination to src/lib/pagination.ts with walkPaginated"
```

---

### Task 1.4: Build `src/lib/update-merge.ts` with two strategies

The merge helper is the spec's safety-critical bit. Two strategies (`'full'` and `'partial'`), empty-patch short-circuit, type-honest signature.

**Files:**
- Create: `src/lib/update-merge.ts`
- Create: `src/test/lib/update-merge.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/lib/update-merge.test.ts`:

```ts
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

      await applyUpdate<FixtureResource, FixtureBody>(
        'full',
        { description: null as unknown as string },
        fetchCurrent,
        put,
        WHITELIST,
      );

      // Per spec §3.3: null is treated the same as undefined.
      // The helper strips null patch values before merging, so the
      // existing record's description survives unchanged.
      const sentBody = put.mock.calls[0][0];
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/lib/update-merge.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/update-merge.ts`:

```ts
export type MergeStrategy = 'full' | 'partial';

/**
 * Strip null and undefined values from a patch.
 * Per spec §3.3, null is treated the same as undefined ("leave the
 * existing value alone"). Stripping up-front keeps both the empty-patch
 * short-circuit and the merge loop honest.
 */
function stripNullish<TBody extends object>(patch: Partial<TBody>): Partial<TBody> {
  const cleaned: Partial<TBody> = {};
  for (const key of Object.keys(patch) as Array<keyof TBody>) {
    const value = patch[key];
    if (value !== null && value !== undefined) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function applyUpdate<TResource extends object, TBody extends object>(
  strategy: MergeStrategy,
  patch: Partial<TBody>,
  fetchCurrent: () => Promise<TResource>,
  put: (body: Partial<TBody>) => Promise<TResource>,
  whitelist: ReadonlyArray<keyof TBody & keyof TResource>,
): Promise<TResource> {
  const effective = stripNullish(patch);

  if (Object.keys(effective).length === 0) {
    return fetchCurrent();
  }

  if (strategy === 'partial') {
    return put(effective);
  }

  const existing = await fetchCurrent();
  const body: Partial<TBody> = {};
  for (const key of whitelist) {
    const fromPatch = effective[key];
    if (fromPatch !== undefined) {
      body[key] = fromPatch;
    } else {
      body[key] = (existing as unknown as TBody)[key];
    }
  }
  return put(body);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/lib/update-merge.test.ts`
Expected: PASS — all 7 tests green (1 empty-patch + 1 partial + 5 full-strategy including null-handling cases).

- [ ] **Step 5: Verify TS still compiles**

Run: `npm run build`
Expected: Compiles. The body has one local `existing as unknown as TBody` cast — that is the only acceptable cast per the spec. Inspect the file to confirm there is no `as TResource` in the return type.

- [ ] **Step 6: Commit**

```bash
git add src/lib/update-merge.ts src/test/lib/update-merge.test.ts
git commit -m "feat(lib): add applyUpdate helper with full and partial strategies"
```

---

### Task 1.5: Build `src/lib/resources/dock.ts`

Extract the dock-entry-with-details pattern that `getCardTable` already uses and that `getMessageBoard` and `getSchedule` will reuse.

**Files:**
- Create: `src/lib/resources/dock.ts`
- Create: `src/test/resources/dock.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/resources/dock.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { getDockEntryWithDetails } from '../../lib/resources/dock.js';
import type { AxiosInstance } from 'axios';

function makeMockClient(
  responses: Record<string, any>,
): AxiosInstance {
  return {
    get: vi.fn(async (url: string) => {
      if (responses[url]) return { data: responses[url] };
      throw new Error(`Unexpected GET ${url}`);
    }),
  } as unknown as AxiosInstance;
}

describe('getDockEntryWithDetails', () => {
  it('fetches the project, finds the named dock entry, and fetches details', async () => {
    const client = makeMockClient({
      '/projects/123.json': {
        id: '123',
        dock: [
          { id: '999', name: 'message_board', enabled: true },
          { id: '888', name: 'schedule', enabled: true },
        ],
      },
      '/buckets/123/message_boards/999.json': { id: '999', title: 'Board' },
    });

    const result = await getDockEntryWithDetails<{ id: string; title: string }>(
      client,
      '123',
      'message_board',
      (projectId, entryId) => `/buckets/${projectId}/message_boards/${entryId}.json`,
    );

    expect(result).toEqual({ id: '999', title: 'Board' });
    expect(client.get).toHaveBeenCalledTimes(2);
    expect(client.get).toHaveBeenNthCalledWith(1, '/projects/123.json');
    expect(client.get).toHaveBeenNthCalledWith(2, '/buckets/123/message_boards/999.json');
  });

  it('throws a clear error when the named dock entry is missing', async () => {
    const client = makeMockClient({
      '/projects/123.json': {
        id: '123',
        dock: [{ id: '999', name: 'message_board', enabled: true }],
      },
    });

    await expect(
      getDockEntryWithDetails(
        client,
        '123',
        'schedule',
        (p, e) => `/buckets/${p}/schedules/${e}.json`,
      ),
    ).rejects.toThrow(/No schedule dock entry found for project 123/);
  });

  it('coerces non-string entry ids to string when building the details path', async () => {
    const client = makeMockClient({
      '/projects/123.json': {
        id: '123',
        dock: [{ id: 999, name: 'card_table', enabled: true }],
      },
      '/buckets/123/card_tables/999.json': { id: 999, title: 'Board' },
    });

    await getDockEntryWithDetails(
      client,
      '123',
      'card_table',
      (p, e) => `/buckets/${p}/card_tables/${e}.json`,
    );

    expect(client.get).toHaveBeenNthCalledWith(2, '/buckets/123/card_tables/999.json');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/resources/dock.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write minimal implementation**

Create `src/lib/resources/dock.ts`:

```ts
import type { AxiosInstance } from 'axios';

export async function getDockEntryWithDetails<T>(
  client: AxiosInstance,
  projectId: string,
  dockName: string,
  detailsPath: (projectId: string, entryId: string) => string,
): Promise<T> {
  const projectResponse = await client.get(`/projects/${projectId}.json`);
  const entry = (projectResponse.data?.dock ?? []).find(
    (d: { name: string }) => d.name === dockName,
  );
  if (!entry) {
    throw new Error(`No ${dockName} dock entry found for project ${projectId}`);
  }
  const detailsResponse = await client.get(
    detailsPath(projectId, String(entry.id)),
  );
  return detailsResponse.data as T;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/resources/dock.test.ts`
Expected: PASS — all 3 tests green.

- [ ] **Step 5: Add `getCardTableWithDetails` to the client**

The existing `getCardTable` returns the dock entry only; a separate `getCardTableDetails` fetches the full record. Both are called together in `src/index.ts` (around lines 776-787). Do not break that two-call contract — add a new combined method that uses the helper. The `get_card_table` MCP tool will be updated in Chunk 3 to call this new method.

In `src/lib/basecamp-client.ts`, add the import at the top of the file (just after the existing `axios` and type imports):

```ts
import { getDockEntryWithDetails } from './resources/dock.js';
```

Then append the new method to the `BasecampClient` class (after the existing `getCardTableDetails` method):

```ts
async getCardTableWithDetails(projectId: string): Promise<CardTable> {
  return getDockEntryWithDetails<CardTable>(
    this.client,
    projectId,
    'card_table',
    (p, id) => `/buckets/${p}/card_tables/${id}.json`,
  );
}
```

`CardTable` is already imported at the top of the file (line 7), so no additional type import is needed. `dock.ts` does not import from `basecamp-client.ts`, so no circular dependency.

- [ ] **Step 6: Run the full test suite to confirm no regression**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/resources/dock.ts src/test/resources/dock.test.ts src/lib/basecamp-client.ts
git commit -m "feat(lib): add getDockEntryWithDetails helper; getCardTableWithDetails delegates"
```

---

### Task 1.6: Verify Chunk 1

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — every test green, including the 19 new tests added in this chunk (9 pagination + 7 update-merge + 3 dock).

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: No type errors.

- [ ] **Step 3: Confirm no file in `src/` exceeds 800 lines**

Run: `find src -name '*.ts' -not -path '*/node_modules/*' -exec wc -l {} \; | sort -rn | head -5`
Expected: `basecamp-client.ts` is the largest at ~610 lines (a hair larger than before due to the new method); everything else is small.

- [ ] **Step 4: Confirm git history is tidy**

Run: `git log --oneline -8`
Expected: Five commits from Chunk 1, all in conventional-commit form.

End of Chunk 1.
