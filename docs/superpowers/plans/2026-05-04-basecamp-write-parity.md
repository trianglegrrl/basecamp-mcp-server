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

// Public input shape for create_message — same as MessageCreateBody minus
// the always-'active' status (which the resource layer adds). Lives here
// so it follows the convention that all wire/input types are in this file.
export interface CreateMessageInput {
  subject: string;
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

---

## Chunk 2a: Resource modules — todos, todolists, comments

This chunk adds the BC3 HTTP methods for three of the five new resources. Each is its own file under `src/lib/resources/`, with a thin delegation method on `BasecampClient`. All work is TDD; each task is one resource module + its tests + the delegation methods + a single commit. The file pattern established in Chunk 1's `dock.ts` is the template: free functions taking an `AxiosInstance`, no class state.

(Chunk 2 is split into 2a and 2b to keep each execution session under the 1000-line review cap. Same patterns; Chunk 2b covers messages, schedule, recording-status.)

**Pattern reused in every task in this chunk:**

```ts
// Resource file shape:
import type { AxiosInstance } from 'axios';
import type { /* resource + body types */ } from '../../types/basecamp.js';

export async function operationName(
  client: AxiosInstance,
  ...args: unknown[],
): Promise<ReturnType> {
  const response = await client.someVerb('/path.json', body);
  return response.data;
}

// Test file shape — see dock.test.ts for the makeMockClient helper.
// Each test asserts URL, HTTP method, and (for POST/PUT) body.
```

### Task 2a.1: Resource module — `src/lib/resources/todos.ts`

Six methods: `getTodo`, `createTodo`, `updateTodo`, `completeTodo`, `uncompleteTodo`, `repositionTodo`. The `updateTodo` function uses `applyUpdate` with the `'full'` strategy.

**Files:**
- Create: `src/lib/resources/todos.ts`
- Create: `src/test/resources/todos.test.ts`
- Modify: `src/lib/basecamp-client.ts` (add 6 delegation methods)

- [ ] **Step 1: Write the failing test**

Create `src/test/resources/todos.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import {
  getTodo,
  createTodo,
  updateTodo,
  completeTodo,
  uncompleteTodo,
  repositionTodo,
} from '../../lib/resources/todos.js';
import type { AxiosInstance } from 'axios';

function makeMockClient(): AxiosInstance & {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
} {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  } as any;
}

describe('todos resource', () => {
  describe('getTodo', () => {
    it('GETs /buckets/{p}/todos/{id}.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '1', content: 'x' } });
      const result = await getTodo(client, '100', '1');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/todos/1.json');
      expect(result).toEqual({ id: '1', content: 'x' });
    });
  });

  describe('createTodo', () => {
    it('POSTs the body to /buckets/{p}/todolists/{tl}/todos.json', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '99', content: 'new' } });
      const result = await createTodo(client, '100', '50', { content: 'new', due_on: '2026-09-01' });
      expect(client.post).toHaveBeenCalledWith(
        '/buckets/100/todolists/50/todos.json',
        { content: 'new', due_on: '2026-09-01' },
      );
      expect(result.id).toBe('99');
    });
  });

  describe('updateTodo', () => {
    it("uses 'full' strategy: GETs current then PUTs whitelisted union", async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({
        data: {
          id: '1',
          content: 'old',
          description: 'desc',
          assignee_ids: [10],
          completion_subscriber_ids: [],
          due_on: '2026-01-01',
          starts_on: null,
          notify: false,
          created_at: 'x',
        },
      });
      client.put.mockResolvedValue({ data: { id: '1', content: 'new' } });

      await updateTodo(client, '100', '1', { content: 'new' });

      expect(client.get).toHaveBeenCalledWith('/buckets/100/todos/1.json');
      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/todos/1.json',
        {
          content: 'new',
          description: 'desc',
          assignee_ids: [10],
          completion_subscriber_ids: [],
          due_on: '2026-01-01',
          starts_on: null,
          notify: false,
        },
      );
    });

    it('skips PUT when patch is empty', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '1', content: 'old' } });
      await updateTodo(client, '100', '1', {});
      expect(client.put).not.toHaveBeenCalled();
    });
  });

  describe('completeTodo', () => {
    it('POSTs to /buckets/{p}/todos/{id}/completion.json', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: undefined });
      await completeTodo(client, '100', '1');
      expect(client.post).toHaveBeenCalledWith('/buckets/100/todos/1/completion.json');
    });
  });

  describe('uncompleteTodo', () => {
    it('DELETEs /buckets/{p}/todos/{id}/completion.json', async () => {
      const client = makeMockClient();
      client.delete.mockResolvedValue({ data: undefined });
      await uncompleteTodo(client, '100', '1');
      expect(client.delete).toHaveBeenCalledWith('/buckets/100/todos/1/completion.json');
    });
  });

  describe('repositionTodo', () => {
    it('PUTs {position} to /buckets/{p}/todos/{id}/position.json', async () => {
      const client = makeMockClient();
      client.put.mockResolvedValue({ data: undefined });
      await repositionTodo(client, '100', '1', 3);
      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/todos/1/position.json',
        { position: 3 },
      );
    });

    it('includes parent_id when provided', async () => {
      const client = makeMockClient();
      client.put.mockResolvedValue({ data: undefined });
      await repositionTodo(client, '100', '1', 1, '777');
      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/todos/1/position.json',
        { position: 1, parent_id: '777' },
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/resources/todos.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/resources/todos.ts`:

```ts
import type { AxiosInstance } from 'axios';
import { applyUpdate } from '../update-merge.js';
import type { Todo, TodoCreateBody, TodoUpdateBody } from '../../types/basecamp.js';

const TODO_UPDATE_WHITELIST = [
  'content',
  'description',
  'assignee_ids',
  'completion_subscriber_ids',
  'due_on',
  'starts_on',
  'notify',
] as const satisfies ReadonlyArray<keyof TodoUpdateBody & keyof Todo>;

export async function getTodo(
  client: AxiosInstance,
  projectId: string,
  todoId: string,
): Promise<Todo> {
  const response = await client.get(`/buckets/${projectId}/todos/${todoId}.json`);
  return response.data;
}

export async function createTodo(
  client: AxiosInstance,
  projectId: string,
  todolistId: string,
  body: TodoCreateBody,
): Promise<Todo> {
  const response = await client.post(
    `/buckets/${projectId}/todolists/${todolistId}/todos.json`,
    body,
  );
  return response.data;
}

export async function updateTodo(
  client: AxiosInstance,
  projectId: string,
  todoId: string,
  patch: TodoUpdateBody,
): Promise<Todo> {
  return applyUpdate<Todo, TodoUpdateBody>(
    'full',
    patch,
    () => getTodo(client, projectId, todoId),
    async (body) => {
      const response = await client.put(
        `/buckets/${projectId}/todos/${todoId}.json`,
        body,
      );
      return response.data;
    },
    TODO_UPDATE_WHITELIST,
  );
}

export async function completeTodo(
  client: AxiosInstance,
  projectId: string,
  todoId: string,
): Promise<void> {
  await client.post(`/buckets/${projectId}/todos/${todoId}/completion.json`);
}

export async function uncompleteTodo(
  client: AxiosInstance,
  projectId: string,
  todoId: string,
): Promise<void> {
  await client.delete(`/buckets/${projectId}/todos/${todoId}/completion.json`);
}

export async function repositionTodo(
  client: AxiosInstance,
  projectId: string,
  todoId: string,
  position: number,
  parentId?: string,
): Promise<void> {
  const body: { position: number; parent_id?: string } = { position };
  if (parentId !== undefined) body.parent_id = parentId;
  await client.put(`/buckets/${projectId}/todos/${todoId}/position.json`, body);
}
```

- [ ] **Step 4: Add the delegation methods on `BasecampClient`**

Append to the `BasecampClient` class in `src/lib/basecamp-client.ts` (after the existing `getTodo` method — there's already one at line 161; the new delegation can replace its body, or remove the old one and let the delegation be the only definition. Use the delegation as the canonical version):

```ts
import * as todosResource from './resources/todos.js';
import type { TodoCreateBody, TodoUpdateBody } from '../types/basecamp.js';
```

Add these methods on the class (the `getTodo` already exists — replace its body with the delegation; the rest are new):

```ts
async getTodo(projectId: string, todoId: string): Promise<Todo> {
  return todosResource.getTodo(this.client, projectId, todoId);
}

async createTodo(
  projectId: string,
  todolistId: string,
  body: TodoCreateBody,
): Promise<Todo> {
  return todosResource.createTodo(this.client, projectId, todolistId, body);
}

async updateTodo(
  projectId: string,
  todoId: string,
  patch: TodoUpdateBody,
): Promise<Todo> {
  return todosResource.updateTodo(this.client, projectId, todoId, patch);
}

async completeTodo(projectId: string, todoId: string): Promise<void> {
  return todosResource.completeTodo(this.client, projectId, todoId);
}

async uncompleteTodo(projectId: string, todoId: string): Promise<void> {
  return todosResource.uncompleteTodo(this.client, projectId, todoId);
}

async repositionTodo(
  projectId: string,
  todoId: string,
  position: number,
  parentId?: string,
): Promise<void> {
  return todosResource.repositionTodo(this.client, projectId, todoId, position, parentId);
}
```

**SIGNATURE CHANGE — must update existing callers in the same task.** The existing `getTodo` at line 161-164 takes only `(todoId)` and uses the `/todos/{id}.json` flat route. The new delegation takes `(projectId, todoId)` and uses the bucket-scoped route. There must be exactly **one** `getTodo` method on the class after this step — delete the old method body completely and let the delegation be the only definition.

Find every existing caller and update it before running tests:

```bash
grep -rn "\.getTodo(" src/ | grep -v test/resources/todos.test.ts
```

Known caller: `src/test/basecamp-client.test.ts` around line 281 calls `client.getTodo('789')` and asserts the URL `/todos/789.json`. Update that test to use the new signature and bucket-scoped URL:

```ts
// Before:
mockAxiosInstance.get.mockResolvedValue({ data: mockTodo });
const result = await client.getTodo('789');
expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos/789.json');

// After:
mockAxiosInstance.get.mockResolvedValue({ data: mockTodo });
const result = await client.getTodo('123', '789');
expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/todos/789.json');
```

The MCP tool layer in Chunk 3 will use the new signature, so we don't need to update production callers there.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/test/resources/todos.test.ts`
Expected: PASS — all 8 tests green.

- [ ] **Step 6: Run the full suite (regression check)**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/resources/todos.ts src/test/resources/todos.test.ts src/lib/basecamp-client.ts
git commit -m "feat(resources): add todos write methods (create/update/complete/reposition)"
```

---

### Task 2a.2: Resource module — `src/lib/resources/todolists.ts`

Three methods: `getTodolist`, `createTodolist`, `updateTodolist`. Update uses `'full'` strategy.

**Files:**
- Create: `src/lib/resources/todolists.ts`
- Create: `src/test/resources/todolists.test.ts`
- Modify: `src/lib/basecamp-client.ts` (add 3 delegations)

- [ ] **Step 1: Write the failing test**

Create `src/test/resources/todolists.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { getTodolist, createTodolist, updateTodolist } from '../../lib/resources/todolists.js';
import type { AxiosInstance } from 'axios';

function makeMockClient() {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>;
  };
}

describe('todolists resource', () => {
  describe('getTodolist', () => {
    it('GETs /buckets/{p}/todolists/{id}.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '50', name: 'My list' } });
      const result = await getTodolist(client, '100', '50');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/todolists/50.json');
      expect(result.name).toBe('My list');
    });
  });

  describe('createTodolist', () => {
    it('POSTs body to /buckets/{p}/todosets/{ts}/todolists.json', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '50', name: 'New' } });
      await createTodolist(client, '100', '5', { name: 'New', description: '<em>go</em>' });
      expect(client.post).toHaveBeenCalledWith(
        '/buckets/100/todosets/5/todolists.json',
        { name: 'New', description: '<em>go</em>' },
      );
    });
  });

  describe('updateTodolist', () => {
    it("uses 'full' strategy: GET then PUT with whitelisted union", async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({
        data: { id: '50', name: 'old', description: 'desc' },
      });
      client.put.mockResolvedValue({ data: { id: '50', name: 'new', description: 'desc' } });

      await updateTodolist(client, '100', '50', { name: 'new' });

      expect(client.get).toHaveBeenCalledWith('/buckets/100/todolists/50.json');
      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/todolists/50.json',
        { name: 'new', description: 'desc' },
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/resources/todolists.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/resources/todolists.ts`:

```ts
import type { AxiosInstance } from 'axios';
import { applyUpdate } from '../update-merge.js';
import type {
  TodoList,
  TodolistCreateBody,
  TodolistUpdateBody,
} from '../../types/basecamp.js';

const TODOLIST_UPDATE_WHITELIST = [
  'name',
  'description',
] as const satisfies ReadonlyArray<keyof TodolistUpdateBody & keyof TodoList>;

export async function getTodolist(
  client: AxiosInstance,
  projectId: string,
  todolistId: string,
): Promise<TodoList> {
  const response = await client.get(`/buckets/${projectId}/todolists/${todolistId}.json`);
  return response.data;
}

export async function createTodolist(
  client: AxiosInstance,
  projectId: string,
  todosetId: string,
  body: TodolistCreateBody,
): Promise<TodoList> {
  const response = await client.post(
    `/buckets/${projectId}/todosets/${todosetId}/todolists.json`,
    body,
  );
  return response.data;
}

export async function updateTodolist(
  client: AxiosInstance,
  projectId: string,
  todolistId: string,
  patch: TodolistUpdateBody,
): Promise<TodoList> {
  return applyUpdate<TodoList, TodolistUpdateBody>(
    'full',
    patch,
    () => getTodolist(client, projectId, todolistId),
    async (body) => {
      const response = await client.put(
        `/buckets/${projectId}/todolists/${todolistId}.json`,
        body,
      );
      return response.data;
    },
    TODOLIST_UPDATE_WHITELIST,
  );
}
```

- [ ] **Step 4: Add the delegation methods**

In `src/lib/basecamp-client.ts`, add the import:

```ts
import * as todolistsResource from './resources/todolists.js';
import type { TodolistCreateBody, TodolistUpdateBody } from '../types/basecamp.js';
```

Then add to the class (after the existing `getTodoLists` method around line 143):

```ts
async getTodolist(projectId: string, todolistId: string): Promise<TodoList> {
  return todolistsResource.getTodolist(this.client, projectId, todolistId);
}

async createTodolist(
  projectId: string,
  todosetId: string,
  body: TodolistCreateBody,
): Promise<TodoList> {
  return todolistsResource.createTodolist(this.client, projectId, todosetId, body);
}

async updateTodolist(
  projectId: string,
  todolistId: string,
  patch: TodolistUpdateBody,
): Promise<TodoList> {
  return todolistsResource.updateTodolist(this.client, projectId, todolistId, patch);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/test/resources/todolists.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/resources/todolists.ts src/test/resources/todolists.test.ts src/lib/basecamp-client.ts
git commit -m "feat(resources): add todolists create/update/get methods"
```

---

### Task 2a.3: Resource module — `src/lib/resources/comments.ts`

Three methods: `getComment`, `createComment`, `updateComment`. Update uses `'partial'` strategy (single-field whitelist; no merge needed).

**Files:**
- Create: `src/lib/resources/comments.ts`
- Create: `src/test/resources/comments.test.ts`
- Modify: `src/lib/basecamp-client.ts` (add 3 delegations)

- [ ] **Step 1: Write the failing test**

Create `src/test/resources/comments.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { getComment, createComment, updateComment } from '../../lib/resources/comments.js';
import type { AxiosInstance } from 'axios';

function makeMockClient() {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>;
  };
}

describe('comments resource', () => {
  describe('getComment', () => {
    it('GETs /buckets/{p}/comments/{id}.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '7', content: 'hi' } });
      const result = await getComment(client, '100', '7');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/comments/7.json');
      expect(result.content).toBe('hi');
    });
  });

  describe('createComment', () => {
    it('POSTs body to /buckets/{p}/recordings/{r}/comments.json', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '7', content: 'hello' } });
      await createComment(client, '100', '500', { content: '<div>hello</div>' });
      expect(client.post).toHaveBeenCalledWith(
        '/buckets/100/recordings/500/comments.json',
        { content: '<div>hello</div>' },
      );
    });
  });

  describe('updateComment', () => {
    it("uses 'partial' strategy: PUTs only the patch and never GETs first", async () => {
      const client = makeMockClient();
      client.put.mockResolvedValue({ data: { id: '7', content: 'updated' } });
      await updateComment(client, '100', '7', { content: 'updated' });
      expect(client.get).not.toHaveBeenCalled();
      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/comments/7.json',
        { content: 'updated' },
      );
    });

    it('short-circuits to a no-op-style get when patch is empty (defensive)', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '7', content: 'unchanged' } });
      const result = await updateComment(client, '100', '7', {});
      expect(client.put).not.toHaveBeenCalled();
      expect(result.content).toBe('unchanged');
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/resources/comments.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/resources/comments.ts`:

```ts
import type { AxiosInstance } from 'axios';
import { applyUpdate } from '../update-merge.js';
import type {
  Comment,
  CommentCreateBody,
  CommentUpdateBody,
} from '../../types/basecamp.js';

const COMMENT_UPDATE_WHITELIST = [
  'content',
] as const satisfies ReadonlyArray<keyof CommentUpdateBody & keyof Comment>;

export async function getComment(
  client: AxiosInstance,
  projectId: string,
  commentId: string,
): Promise<Comment> {
  const response = await client.get(`/buckets/${projectId}/comments/${commentId}.json`);
  return response.data;
}

export async function createComment(
  client: AxiosInstance,
  projectId: string,
  recordingId: string,
  body: CommentCreateBody,
): Promise<Comment> {
  const response = await client.post(
    `/buckets/${projectId}/recordings/${recordingId}/comments.json`,
    body,
  );
  return response.data;
}

export async function updateComment(
  client: AxiosInstance,
  projectId: string,
  commentId: string,
  patch: CommentUpdateBody,
): Promise<Comment> {
  return applyUpdate<Comment, CommentUpdateBody>(
    'partial',
    patch,
    () => getComment(client, projectId, commentId),
    async (body) => {
      const response = await client.put(
        `/buckets/${projectId}/comments/${commentId}.json`,
        body,
      );
      return response.data;
    },
    COMMENT_UPDATE_WHITELIST,
  );
}
```

- [ ] **Step 4: Add the delegation methods**

In `src/lib/basecamp-client.ts`, add the import:

```ts
import * as commentsResource from './resources/comments.js';
import type { CommentCreateBody, CommentUpdateBody } from '../types/basecamp.js';
```

Then add to the class (after the existing `getComments` method around line 475):

```ts
async getComment(projectId: string, commentId: string): Promise<Comment> {
  return commentsResource.getComment(this.client, projectId, commentId);
}

async createComment(
  projectId: string,
  recordingId: string,
  body: CommentCreateBody,
): Promise<Comment> {
  return commentsResource.createComment(this.client, projectId, recordingId, body);
}

async updateComment(
  projectId: string,
  commentId: string,
  patch: CommentUpdateBody,
): Promise<Comment> {
  return commentsResource.updateComment(this.client, projectId, commentId, patch);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/test/resources/comments.test.ts`
Expected: PASS — 4 tests green.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/resources/comments.ts src/test/resources/comments.test.ts src/lib/basecamp-client.ts
git commit -m "feat(resources): add comments create/update/get methods"
```

---

### Task 2a.4: Verify Chunk 2a

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — every test green, including the 15 new tests added in Chunk 2a (8 todos + 3 todolists + 4 comments).

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: No type errors. The `as const satisfies ReadonlyArray<keyof TBody & keyof TResource>` constraint must compile against the body types added in Chunk 1 Task 1.2.

- [ ] **Step 3: Confirm `basecamp-client.ts` size after Chunk 2a**

Run: `wc -l src/lib/basecamp-client.ts`
Expected: under 700 lines. (Started at 591 before Chunk 1; Chunk 1 added the `getCardTableWithDetails` method and import; Chunk 2a adds 12 delegation methods and 3 imports — should land around 670.)

- [ ] **Step 4: Confirm git history**

Run: `git log --oneline -3`
Expected: three new commits from Chunk 2a (todos / todolists / comments), conventional-commit form.

End of Chunk 2a.

---

## Chunk 2b: Resource modules — messages, schedule, recording-status

This chunk completes the resource layer with the three remaining modules. Same TDD pattern; messages and schedule both reuse the `getDockEntryWithDetails` helper from Chunk 1.

### Task 2b.1: Resource module — `src/lib/resources/messages.ts`

Five methods: `getMessageBoard`, `getMessages`, `getMessage`, `createMessage`, `updateMessage`. `getMessageBoard` uses the dock helper from Chunk 1. `createMessage` always sends `status: 'active'`. Update uses `'full'` strategy.

**Files:**
- Create: `src/lib/resources/messages.ts`
- Create: `src/test/resources/messages.test.ts`
- Modify: `src/lib/basecamp-client.ts` (add 5 delegations)

- [ ] **Step 1: Write the failing test**

Create `src/test/resources/messages.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import {
  getMessageBoard,
  getMessages,
  getMessage,
  createMessage,
  updateMessage,
} from '../../lib/resources/messages.js';
import type { AxiosInstance } from 'axios';

function makeMockClient() {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>;
  };
}

describe('messages resource', () => {
  describe('getMessageBoard', () => {
    it('uses the dock helper to fetch the board details', async () => {
      const client = makeMockClient();
      client.get
        .mockResolvedValueOnce({
          data: { id: '100', dock: [{ id: '999', name: 'message_board', enabled: true }] },
        })
        .mockResolvedValueOnce({
          data: { id: '999', title: 'Board' },
        });

      const result = await getMessageBoard(client, '100');
      expect(client.get).toHaveBeenNthCalledWith(1, '/projects/100.json');
      expect(client.get).toHaveBeenNthCalledWith(2, '/buckets/100/message_boards/999.json');
      expect(result).toEqual({ id: '999', title: 'Board' });
    });
  });

  describe('getMessages', () => {
    it('GETs /buckets/{p}/message_boards/{mb}/messages.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: [{ id: '1' }] });
      const result = await getMessages(client, '100', '999');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/message_boards/999/messages.json');
      expect(result).toEqual([{ id: '1' }]);
    });
  });

  describe('getMessage', () => {
    it('GETs /buckets/{p}/messages/{id}.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '1' } });
      await getMessage(client, '100', '1');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/messages/1.json');
    });
  });

  describe('createMessage', () => {
    it("POSTs the body with status: 'active' always set", async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '1', subject: 'Hi' } });
      await createMessage(client, '100', '999', { subject: 'Hi', content: '<div>x</div>' });
      expect(client.post).toHaveBeenCalledWith(
        '/buckets/100/message_boards/999/messages.json',
        { subject: 'Hi', content: '<div>x</div>', status: 'active' },
      );
    });

    it('forwards optional category_id and subscriptions', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '1', subject: 'X' } });
      await createMessage(client, '100', '999', {
        subject: 'X',
        category_id: 7,
        subscriptions: [10, 20],
      });
      const sent = client.post.mock.calls[0][1];
      expect(sent.category_id).toBe(7);
      expect(sent.subscriptions).toEqual([10, 20]);
      expect(sent.status).toBe('active');
    });
  });

  describe('updateMessage', () => {
    it("uses 'full' strategy: GET then PUT whitelisted union", async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({
        data: { id: '1', subject: 'old', content: 'old c', category_id: 3 },
      });
      client.put.mockResolvedValue({ data: { id: '1', subject: 'new' } });

      await updateMessage(client, '100', '1', { subject: 'new' });

      expect(client.get).toHaveBeenCalledWith('/buckets/100/messages/1.json');
      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/messages/1.json',
        { subject: 'new', content: 'old c', category_id: 3 },
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/resources/messages.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/resources/messages.ts`:

```ts
import type { AxiosInstance } from 'axios';
import { applyUpdate } from '../update-merge.js';
import { getDockEntryWithDetails } from './dock.js';
import type {
  Message,
  MessageBoard,
  MessageCreateBody,
  MessageUpdateBody,
  CreateMessageInput,
} from '../../types/basecamp.js';

const MESSAGE_UPDATE_WHITELIST = [
  'subject',
  'content',
  'category_id',
] as const satisfies ReadonlyArray<keyof MessageUpdateBody & keyof Message>;

export async function getMessageBoard(
  client: AxiosInstance,
  projectId: string,
): Promise<MessageBoard> {
  return getDockEntryWithDetails<MessageBoard>(
    client,
    projectId,
    'message_board',
    (p, id) => `/buckets/${p}/message_boards/${id}.json`,
  );
}

export async function getMessages(
  client: AxiosInstance,
  projectId: string,
  messageBoardId: string,
): Promise<Message[]> {
  const response = await client.get(
    `/buckets/${projectId}/message_boards/${messageBoardId}/messages.json`,
  );
  return response.data;
}

export async function getMessage(
  client: AxiosInstance,
  projectId: string,
  messageId: string,
): Promise<Message> {
  const response = await client.get(`/buckets/${projectId}/messages/${messageId}.json`);
  return response.data;
}

export async function createMessage(
  client: AxiosInstance,
  projectId: string,
  messageBoardId: string,
  input: CreateMessageInput,
): Promise<Message> {
  const body: MessageCreateBody = { ...input, status: 'active' };
  const response = await client.post(
    `/buckets/${projectId}/message_boards/${messageBoardId}/messages.json`,
    body,
  );
  return response.data;
}

export async function updateMessage(
  client: AxiosInstance,
  projectId: string,
  messageId: string,
  patch: MessageUpdateBody,
): Promise<Message> {
  return applyUpdate<Message, MessageUpdateBody>(
    'full',
    patch,
    () => getMessage(client, projectId, messageId),
    async (body) => {
      const response = await client.put(
        `/buckets/${projectId}/messages/${messageId}.json`,
        body,
      );
      return response.data;
    },
    MESSAGE_UPDATE_WHITELIST,
  );
}
```

- [ ] **Step 4: Add the delegation methods**

In `src/lib/basecamp-client.ts`, add the import:

```ts
import * as messagesResource from './resources/messages.js';
import type { CreateMessageInput, MessageUpdateBody } from '../types/basecamp.js';
```

Then add to the class (logical place: after the existing `Communication methods` block around line 469):

```ts
async getMessageBoard(projectId: string): Promise<MessageBoard> {
  return messagesResource.getMessageBoard(this.client, projectId);
}

async getMessages(projectId: string, messageBoardId: string): Promise<Message[]> {
  return messagesResource.getMessages(this.client, projectId, messageBoardId);
}

async getMessage(projectId: string, messageId: string): Promise<Message> {
  return messagesResource.getMessage(this.client, projectId, messageId);
}

async createMessage(
  projectId: string,
  messageBoardId: string,
  input: CreateMessageInput,
): Promise<Message> {
  return messagesResource.createMessage(this.client, projectId, messageBoardId, input);
}

async updateMessage(
  projectId: string,
  messageId: string,
  patch: MessageUpdateBody,
): Promise<Message> {
  return messagesResource.updateMessage(this.client, projectId, messageId, patch);
}
```

You will also need `MessageBoard` in the imported types at the top of `basecamp-client.ts`. Add it to the existing type-import block.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/test/resources/messages.test.ts`
Expected: PASS — 6 tests green.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/resources/messages.ts src/test/resources/messages.test.ts src/lib/basecamp-client.ts
git commit -m "feat(resources): add messages get/create/update + message-board lookup"
```

---

### Task 2b.2: Resource module — `src/lib/resources/schedule.ts`

Five methods: `getSchedule`, `getScheduleEntries`, `getScheduleEntry`, `createScheduleEntry`, `updateScheduleEntry`. `getSchedule` uses the dock helper. Update uses `'full'`.

**Files:**
- Create: `src/lib/resources/schedule.ts`
- Create: `src/test/resources/schedule.test.ts`
- Modify: `src/lib/basecamp-client.ts` (add 5 delegations)

- [ ] **Step 1: Write the failing test**

Create `src/test/resources/schedule.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import {
  getSchedule,
  getScheduleEntries,
  getScheduleEntry,
  createScheduleEntry,
  updateScheduleEntry,
} from '../../lib/resources/schedule.js';
import type { AxiosInstance } from 'axios';

function makeMockClient() {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn>;
  };
}

describe('schedule resource', () => {
  describe('getSchedule', () => {
    it('uses the dock helper to fetch schedule details', async () => {
      const client = makeMockClient();
      client.get
        .mockResolvedValueOnce({
          data: { id: '100', dock: [{ id: '888', name: 'schedule', enabled: true }] },
        })
        .mockResolvedValueOnce({ data: { id: '888', title: 'Schedule' } });

      const result = await getSchedule(client, '100');
      expect(client.get).toHaveBeenNthCalledWith(1, '/projects/100.json');
      expect(client.get).toHaveBeenNthCalledWith(2, '/buckets/100/schedules/888.json');
      expect(result).toEqual({ id: '888', title: 'Schedule' });
    });
  });

  describe('getScheduleEntries', () => {
    it('GETs /buckets/{p}/schedules/{s}/entries.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: [{ id: '1' }] });
      await getScheduleEntries(client, '100', '888');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/schedules/888/entries.json');
    });
  });

  describe('getScheduleEntry', () => {
    it('GETs /buckets/{p}/schedule_entries/{id}.json', async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({ data: { id: '7' } });
      await getScheduleEntry(client, '100', '7');
      expect(client.get).toHaveBeenCalledWith('/buckets/100/schedule_entries/7.json');
    });
  });

  describe('createScheduleEntry', () => {
    it('POSTs body to /buckets/{p}/schedules/{s}/entries.json', async () => {
      const client = makeMockClient();
      client.post.mockResolvedValue({ data: { id: '7', summary: 'Lunch' } });
      await createScheduleEntry(client, '100', '888', {
        summary: 'Lunch',
        starts_at: '2026-06-01T12:00:00Z',
        ends_at: '2026-06-01T13:00:00Z',
        all_day: false,
      });
      expect(client.post).toHaveBeenCalledWith(
        '/buckets/100/schedules/888/entries.json',
        {
          summary: 'Lunch',
          starts_at: '2026-06-01T12:00:00Z',
          ends_at: '2026-06-01T13:00:00Z',
          all_day: false,
        },
      );
    });
  });

  describe('updateScheduleEntry', () => {
    it("uses 'full' strategy: GET then PUT whitelisted union", async () => {
      const client = makeMockClient();
      client.get.mockResolvedValue({
        data: {
          id: '7',
          summary: 'old',
          description: 'd',
          starts_at: '2026-06-01T12:00:00Z',
          ends_at: '2026-06-01T13:00:00Z',
          all_day: false,
          notify: false,
          participant_ids: [10],
        },
      });
      client.put.mockResolvedValue({ data: { id: '7' } });

      await updateScheduleEntry(client, '100', '7', { summary: 'new' });

      expect(client.put).toHaveBeenCalledWith(
        '/buckets/100/schedule_entries/7.json',
        {
          summary: 'new',
          description: 'd',
          starts_at: '2026-06-01T12:00:00Z',
          ends_at: '2026-06-01T13:00:00Z',
          participant_ids: [10],
          all_day: false,
          notify: false,
        },
      );
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/resources/schedule.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/resources/schedule.ts`:

```ts
import type { AxiosInstance } from 'axios';
import { applyUpdate } from '../update-merge.js';
import { getDockEntryWithDetails } from './dock.js';
import type {
  Schedule,
  ScheduleEntry,
  ScheduleEntryCreateBody,
  ScheduleEntryUpdateBody,
} from '../../types/basecamp.js';

const SCHEDULE_ENTRY_UPDATE_WHITELIST = [
  'summary',
  'description',
  'starts_at',
  'ends_at',
  'participant_ids',
  'all_day',
  'notify',
] as const satisfies ReadonlyArray<keyof ScheduleEntryUpdateBody & keyof ScheduleEntry>;

export async function getSchedule(
  client: AxiosInstance,
  projectId: string,
): Promise<Schedule> {
  return getDockEntryWithDetails<Schedule>(
    client,
    projectId,
    'schedule',
    (p, id) => `/buckets/${p}/schedules/${id}.json`,
  );
}

export async function getScheduleEntries(
  client: AxiosInstance,
  projectId: string,
  scheduleId: string,
): Promise<ScheduleEntry[]> {
  const response = await client.get(
    `/buckets/${projectId}/schedules/${scheduleId}/entries.json`,
  );
  return response.data;
}

export async function getScheduleEntry(
  client: AxiosInstance,
  projectId: string,
  entryId: string,
): Promise<ScheduleEntry> {
  const response = await client.get(`/buckets/${projectId}/schedule_entries/${entryId}.json`);
  return response.data;
}

export async function createScheduleEntry(
  client: AxiosInstance,
  projectId: string,
  scheduleId: string,
  body: ScheduleEntryCreateBody,
): Promise<ScheduleEntry> {
  const response = await client.post(
    `/buckets/${projectId}/schedules/${scheduleId}/entries.json`,
    body,
  );
  return response.data;
}

export async function updateScheduleEntry(
  client: AxiosInstance,
  projectId: string,
  entryId: string,
  patch: ScheduleEntryUpdateBody,
): Promise<ScheduleEntry> {
  return applyUpdate<ScheduleEntry, ScheduleEntryUpdateBody>(
    'full',
    patch,
    () => getScheduleEntry(client, projectId, entryId),
    async (body) => {
      const response = await client.put(
        `/buckets/${projectId}/schedule_entries/${entryId}.json`,
        body,
      );
      return response.data;
    },
    SCHEDULE_ENTRY_UPDATE_WHITELIST,
  );
}
```

- [ ] **Step 4: Add the delegation methods**

In `src/lib/basecamp-client.ts`, add imports:

```ts
import * as scheduleResource from './resources/schedule.js';
import type {
  Schedule,
  ScheduleEntry,
  ScheduleEntryCreateBody,
  ScheduleEntryUpdateBody,
} from '../types/basecamp.js';
```

Then add to the class (after the messages block from Task 2.4):

```ts
async getSchedule(projectId: string): Promise<Schedule> {
  return scheduleResource.getSchedule(this.client, projectId);
}

async getScheduleEntries(projectId: string, scheduleId: string): Promise<ScheduleEntry[]> {
  return scheduleResource.getScheduleEntries(this.client, projectId, scheduleId);
}

async getScheduleEntry(projectId: string, entryId: string): Promise<ScheduleEntry> {
  return scheduleResource.getScheduleEntry(this.client, projectId, entryId);
}

async createScheduleEntry(
  projectId: string,
  scheduleId: string,
  body: ScheduleEntryCreateBody,
): Promise<ScheduleEntry> {
  return scheduleResource.createScheduleEntry(this.client, projectId, scheduleId, body);
}

async updateScheduleEntry(
  projectId: string,
  entryId: string,
  patch: ScheduleEntryUpdateBody,
): Promise<ScheduleEntry> {
  return scheduleResource.updateScheduleEntry(this.client, projectId, entryId, patch);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/test/resources/schedule.test.ts`
Expected: PASS — 5 tests green.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/resources/schedule.ts src/test/resources/schedule.test.ts src/lib/basecamp-client.ts
git commit -m "feat(resources): add schedule + schedule_entry get/create/update"
```

---

### Task 2b.3: Resource module — `src/lib/resources/recording-status.ts`

Single method: `setRecordingStatus`. PUTs to the generic recordings endpoint. The five `set_*_status` MCP tools all delegate here.

**Files:**
- Create: `src/lib/resources/recording-status.ts`
- Create: `src/test/resources/recording-status.test.ts`
- Modify: `src/lib/basecamp-client.ts` (add 1 delegation)

- [ ] **Step 1: Write the failing test**

Create `src/test/resources/recording-status.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { setRecordingStatus } from '../../lib/resources/recording-status.js';
import type { AxiosInstance } from 'axios';

function makeMockClient() {
  return { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } as unknown as AxiosInstance & {
    put: ReturnType<typeof vi.fn>;
  };
}

describe('setRecordingStatus', () => {
  it('PUTs /buckets/{p}/recordings/{id}/status/trashed.json for status=trashed', async () => {
    const client = makeMockClient();
    client.put.mockResolvedValue({ data: undefined });
    await setRecordingStatus(client, '100', '7', 'trashed');
    expect(client.put).toHaveBeenCalledWith('/buckets/100/recordings/7/status/trashed.json');
  });

  it('PUTs status/archived.json for status=archived', async () => {
    const client = makeMockClient();
    client.put.mockResolvedValue({ data: undefined });
    await setRecordingStatus(client, '100', '7', 'archived');
    expect(client.put).toHaveBeenCalledWith('/buckets/100/recordings/7/status/archived.json');
  });

  it('PUTs status/active.json for status=active (unarchive)', async () => {
    const client = makeMockClient();
    client.put.mockResolvedValue({ data: undefined });
    await setRecordingStatus(client, '100', '7', 'active');
    expect(client.put).toHaveBeenCalledWith('/buckets/100/recordings/7/status/active.json');
  });

  it('is idempotent: a second call with the same status sends the same PUT', async () => {
    const client = makeMockClient();
    client.put.mockResolvedValue({ data: undefined });
    await setRecordingStatus(client, '100', '7', 'trashed');
    await setRecordingStatus(client, '100', '7', 'trashed');
    expect(client.put).toHaveBeenCalledTimes(2);
    expect(client.put).toHaveBeenNthCalledWith(1, '/buckets/100/recordings/7/status/trashed.json');
    expect(client.put).toHaveBeenNthCalledWith(2, '/buckets/100/recordings/7/status/trashed.json');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/resources/recording-status.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/lib/resources/recording-status.ts`:

```ts
import type { AxiosInstance } from 'axios';
import type { RecordingStatus } from '../../types/basecamp.js';

export async function setRecordingStatus(
  client: AxiosInstance,
  projectId: string,
  recordingId: string,
  status: RecordingStatus,
): Promise<void> {
  await client.put(`/buckets/${projectId}/recordings/${recordingId}/status/${status}.json`);
}
```

- [ ] **Step 4: Add the delegation method**

In `src/lib/basecamp-client.ts`, add the import:

```ts
import * as recordingStatusResource from './resources/recording-status.js';
import type { RecordingStatus } from '../types/basecamp.js';
```

Then add to the class (anywhere in the body — logical place is at the end before the closing brace):

```ts
async setRecordingStatus(
  projectId: string,
  recordingId: string,
  status: RecordingStatus,
): Promise<void> {
  return recordingStatusResource.setRecordingStatus(this.client, projectId, recordingId, status);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/test/resources/recording-status.test.ts`
Expected: PASS — 4 tests green.

- [ ] **Step 6: Run the full suite**

Run: `npm test`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/resources/recording-status.ts src/test/resources/recording-status.test.ts src/lib/basecamp-client.ts
git commit -m "feat(resources): add setRecordingStatus (drives all set_*_status tools)"
```

---

### Task 2b.4: Verify Chunk 2b

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — every test green, including the 15 new tests added in Chunk 2b (6 messages + 5 schedule + 4 recording-status), on top of the 15 from Chunk 2a.

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: No type errors. Confirm no `as TResource` casts in any of the resource files (only the single `existing as unknown as TBody` inside `update-merge.ts` is allowed).

- [ ] **Step 3: Confirm `basecamp-client.ts` size**

Run: `wc -l src/lib/basecamp-client.ts`
Expected: under 800 lines. The file started at 591 before any of this work; Chunk 1 added ~10 lines (one method + import), Chunk 2a added ~80 lines (12 delegations + 3 imports), Chunk 2b adds ~90 lines (11 delegations + 4 imports) — should land around 770. If it crosses 800, split `BasecampClient` into a primary class plus a mixin per resource group as a follow-up before Chunk 3.

- [ ] **Step 4: Confirm git history**

Run: `git log --oneline -3`
Expected: three new commits from Chunk 2b (messages / schedule / recording-status), conventional-commit form.

End of Chunk 2b.

---

## Chunk 3a: Tool-layer scaffolding + existing-handler migration + wire-up fixes

This chunk dismantles the 50-case switch in `src/index.ts` and reorganises tool handlers into `src/tools/handlers/*.ts`, one file per resource group. It also fixes the 11 advertised-but-unhandled tools as part of the migration (those handlers go into the same per-resource files, not a separate "fixes" file). No new MCP tools yet — those land in Chunks 3b and 3c.

**Hard dependency: Chunk 1 must land before this chunk.** Task 3a.3 references `getCardTableWithDetails`, which is added in Chunk 1 Task 1.5. Chunk 2a/2b are not required for 3a (they add resource methods that 3b/3c will wire up; existing methods migrated here in 3a are independent).

**Note on orphan tools.** Two tools currently sit in the registrations array with no `BasecampClient` method and no switch case: `search_basecamp` and `global_search`. They have always returned `Unknown tool` when called. Implementing real search is outside the write-parity scope; rather than ship more vaporware behind a renamed module, this chunk **deletes** their registrations (Task 3a.2 Step 3). If anyone wants real search later, it's a clean greenfield design.

### The shared patterns (read first)

Every handler file in this chunk follows the same shape. Read this once; don't repeat it in your head per task.

**Handler module shape (one per resource group):**

```ts
// src/tools/handlers/<resource>.ts
import type { BasecampClient } from '../../lib/basecamp-client.js';
import type { MCPToolResult } from '../../types/basecamp.js';
import { successResult, errorResult } from '../result.js';

export async function handle<ToolName>(
  args: Record<string, any>,
  client: BasecampClient,
): Promise<MCPToolResult> {
  // 1. Pull the args you need from `args`. Trust MCP to have validated
  //    the schema (required fields will be present).
  // 2. Call one BasecampClient method.
  // 3. Wrap the result via successResult({ ... }).
  const data = await client.someMethod(args.project_id, ...);
  return successResult({ some_key: data, count: data.length });
}

export const handlers = {
  some_tool_name: handleSomeToolName,
  another_tool: handleAnotherTool,
} as const;
```

**Test file shape (one per handler module):**

```ts
// src/test/tools/handlers/<resource>.test.ts
import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/<resource>.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(): BasecampClient {
  return {
    someMethod: vi.fn(),
    // ... only the methods this handler module touches
  } as unknown as BasecampClient;
}

describe('<resource> handlers', () => {
  describe('<tool_name>', () => {
    it('dispatches with the expected args + returns success', async () => {
      const client = makeMockClient();
      (client.someMethod as any).mockResolvedValue({ id: '1' });

      const result = await handlers.<tool_name>({ project_id: '100', /* ... */ }, client);

      expect(client.someMethod).toHaveBeenCalledWith('100', /* ... */);
      const payload = JSON.parse(result.content[0].text);
      expect(payload.status).toBe('success');
    });
  });
});
```

**Result helper (created once, used by every handler):** see Task 3a.1.

**Dispatch shape:** `dispatch.ts` is a single map merging every `handlers` export from `handlers/*.ts`. The lookup is `dispatch[name](args, client)`. Returning `undefined` → `Unknown tool` MCPError.

**Registration shape:** `registrations.ts` is a single array literal of `{ name, description, inputSchema }` objects. Existing entries from `src/index.ts` move here verbatim (no schema changes in this chunk).

---

### Task 3a.1: Add the `MCPToolResult` helper module

Tiny shared helper — every handler returns through this so the JSON envelope is consistent.

**Files:**
- Create: `src/tools/result.ts`
- Create: `src/test/tools/result.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/tools/result.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { successResult, errorResult } from '../../tools/result.js';

describe('successResult', () => {
  it('wraps the payload as a JSON-encoded text content block', () => {
    const result = successResult({ todo: { id: '1', content: 'x' } });
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.todo).toEqual({ id: '1', content: 'x' });
  });

  it('always sets status: "success" even if the payload contains a status key', () => {
    const result = successResult({ status: 'something-else', other: 1 });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(parsed.other).toBe(1);
  });
});

describe('errorResult', () => {
  it('wraps an error message as a JSON-encoded text content block', () => {
    const result = errorResult('Something went wrong', { code: 'X' });
    expect(result.content).toHaveLength(1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.message).toBe('Something went wrong');
    expect(parsed.code).toBe('X');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/tools/result.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `src/tools/result.ts`:

```ts
export interface MCPToolResultEnvelope {
  content: Array<{ type: 'text'; text: string }>;
}

export function successResult(payload: Record<string, unknown>): MCPToolResultEnvelope {
  const body = { ...payload, status: 'success' };
  return {
    content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
  };
}

export function errorResult(
  message: string,
  extra: Record<string, unknown> = {},
): MCPToolResultEnvelope {
  const body = { ...extra, status: 'error', message };
  return {
    content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/test/tools/result.test.ts`
Expected: PASS — 3 tests green.

- [ ] **Step 5: Commit**

```bash
git add src/tools/result.ts src/test/tools/result.test.ts
git commit -m "feat(tools): add successResult/errorResult JSON envelope helpers"
```

---

### Task 3a.2: Stand up `src/tools/{registrations,dispatch}.ts` and the new `index.ts` shell

This step moves the tool-list array and the dispatch logic out of `src/index.ts` into the new `src/tools/` files, but does *not* split the dispatch into per-resource handlers yet (that's Task 3a.3). After this step every existing tool still works; the `BasecampMCPServer` class just delegates to the new modules.

**Files:**
- Create: `src/tools/registrations.ts`
- Create: `src/tools/dispatch.ts`
- Create: `src/tools/index.ts`
- Modify: `src/index.ts` (becomes a thin server-bootstrapping shell)
- Create: `src/test/tools/dispatch.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/test/tools/dispatch.test.ts`:

```ts
import { describe, it, expect, vi } from 'vitest';
import { dispatch } from '../../tools/dispatch.js';

describe('dispatch', () => {
  it('routes a known tool name to the registered handler', async () => {
    const client = { getProjects: vi.fn().mockResolvedValue([{ id: '1' }]) } as any;
    const result = await dispatch('get_projects', {}, client);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('success');
    expect(client.getProjects).toHaveBeenCalledOnce();
  });

  it('returns an error envelope for an unknown tool name', async () => {
    const client = {} as any;
    const result = await dispatch('does_not_exist', {}, client);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.status).toBe('error');
    expect(parsed.message).toMatch(/Unknown tool: does_not_exist/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/test/tools/dispatch.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Move `tools` array into `registrations.ts` AND drop two orphan tool registrations**

The current `tools` array in `src/index.ts` advertises two tools — `search_basecamp` and `global_search` — that have **no `BasecampClient` method and no switch case**. They are vaporware: registering as available, returning `Unknown tool` when called. They are outside the write-parity scope and we are not going to invent search behaviour as a side effect of this refactor. Drop both registrations as part of the move.

Create `src/tools/registrations.ts`. Copy the contents of the array literal from `src/index.ts` lines 110-602 (i.e. the lines *between* `tools: [` and `],`, exclusive of those two bracket lines), wrapped in an export. While copying, **omit the two `search_basecamp` and `global_search` registration objects** (they currently sit around lines 130-152 of `src/index.ts`).

```ts
import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  // PASTE the existing entries here, MINUS search_basecamp and global_search.
];
```

If `Tool` isn't exported by the SDK at that path, fall back to:

```ts
export const tools: Array<{
  name: string;
  description: string;
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] };
}> = [
  // ... same array, same omissions
];
```

This is a content-preserving move except for the two intentional omissions, which are documented in the commit message.

- [ ] **Step 4: Move dispatch logic into `dispatch.ts`**

Create `src/tools/dispatch.ts` with a single `dispatch` function that takes `(name, args, client)` and returns a `MCPToolResultEnvelope`. For now, this function contains exactly the same `switch (name) { ... }` block that currently sits inside the second `setRequestHandler` call in `src/index.ts` (the one matching `CallToolRequestSchema` — entire body of that callback, from the inner `switch (name) {` opener down to the matching closing brace), but rewritten to:

1. Pull `client` from a parameter rather than calling `this.getBasecampClient()`.
2. Wrap each case's return through `successResult(...)` (the JSON envelope helper from Task 3a.1) instead of inlining `JSON.stringify(...)` and the `content: [{type:'text', text: ...}]` wrapper.
3. On `default`, return `errorResult(\`Unknown tool: ${name}\`)` instead of throwing `McpError`.
4. On caught exceptions, return `errorResult(error.message ?? 'Unknown error')`.

Sketch:

```ts
import type { BasecampClient } from '../lib/basecamp-client.js';
import { successResult, errorResult, type MCPToolResultEnvelope } from './result.js';

export async function dispatch(
  name: string,
  args: Record<string, any>,
  client: BasecampClient,
): Promise<MCPToolResultEnvelope> {
  try {
    switch (name) {
      case 'get_projects': {
        const projects = await client.getProjects();
        return successResult({ projects, count: projects.length });
      }
      case 'get_project': {
        const project = await client.getProject(args.project_id);
        return successResult({ project });
      }
      // ... all existing cases, ported from src/index.ts ...
      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    if (error.response?.status === 401 && error.response?.data?.error?.includes('expired')) {
      return errorResult('Your Basecamp OAuth token has expired. Please re-authenticate: npm run auth', {
        error: 'OAuth token expired',
      });
    }
    return errorResult(error.message ?? 'Unknown error', { error: 'Execution error' });
  }
}
```

- [ ] **Step 5: Add the `src/tools/index.ts` re-export**

Create `src/tools/index.ts`:

```ts
export { tools } from './registrations.js';
export { dispatch } from './dispatch.js';
```

- [ ] **Step 6: Reduce `src/index.ts` to a bootstrapping shell**

Open `src/index.ts`. Delete the entire body of `setupHandlers` (the array + the call-tool switch). Replace it with:

```ts
private setupHandlers(): void {
  this.server.setRequestHandler(ListToolsRequestSchema, async () => {
    const { tools } = await import('./tools/index.js');
    return { tools };
  });

  this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const client = await this.getBasecampClient();
    const { dispatch } = await import('./tools/index.js');
    return dispatch(request.params.name, (request.params.arguments ?? {}) as Record<string, any>, client);
  });
}
```

The `handleError` helper that lived on the class can stay as private (it's redundant with the dispatch's catch but unused calls don't break anything). Or delete it — your call. Either way, `src/index.ts` should drop from ~1047 lines to under 200.

- [ ] **Step 7: Run the full test suite**

Run: `npm test`
Expected: PASS — every existing tool dispatches identically. The two new dispatch tests pass.

- [ ] **Step 8: Run the build**

Run: `npm run build`
Expected: No type errors.

- [ ] **Step 9: Confirm `src/index.ts` shrunk**

Run: `wc -l src/index.ts`
Expected: under 200 lines.

- [ ] **Step 10: Commit**

```bash
git add src/tools/ src/index.ts src/test/tools/dispatch.test.ts
git commit -m "refactor(tools): move tool registrations + dispatch out of src/index.ts"
```

---

### Task 3a.3: Split `dispatch.ts` into per-resource handler modules + fix the 11 wire-up bugs

This step extracts the giant switch in `dispatch.ts` (created in Task 3a.2) into 5 per-resource handler files under `src/tools/handlers/`. The 11 advertised-but-unhandled tools (which currently fall through to `Unknown tool` because their cases were missing) get their cases written for the first time in the appropriate handler file as part of the migration.

**Migration table — every existing or about-to-exist case maps to one of these handler files:**

| Handler file | Tools handled |
|---|---|
| `handlers/cards.ts` | `get_cards`, `create_card`, **`get_card`**, **`update_card`**, `move_card`, `complete_card`, `get_card_steps`, `create_card_step`, `complete_card_step` |
| `handlers/columns.ts` | `get_card_table`, `get_columns`, `create_column`, **`update_column`**, **`move_column`**, **`update_column_color`** |
| `handlers/documents.ts` | `get_documents`, `create_document`, **`update_document`**, **`trash_document`**, **`get_uploads`** |
| `handlers/webhooks.ts` | **`get_webhooks`**, **`create_webhook`**, **`delete_webhook`** |
| `handlers/misc.ts` | `get_projects`, `get_project`, `get_todolists`, `get_todos`, `get_my_profile`, `get_my_assignments`, `get_my_due_assignments`, `get_my_completed_assignments`, `get_people`, `get_project_people`, `get_assignments_for_person`, `get_campfire_lines`, `get_comments`, `get_daily_check_ins`, `get_question_answers` |

**Bold names = the 11 wire-up bug fixes.** Their `BasecampClient` methods already exist (verified in Chunk 1's reading); we just write the handler bodies and add them to the dispatch.

**Files:**
- Create: `src/tools/handlers/cards.ts`
- Create: `src/tools/handlers/columns.ts`
- Create: `src/tools/handlers/documents.ts`
- Create: `src/tools/handlers/webhooks.ts`
- Create: `src/tools/handlers/misc.ts`
- Create: `src/test/tools/handlers/{cards,columns,documents,webhooks,misc}.test.ts`
- Modify: `src/tools/dispatch.ts` (replace the big switch with a lookup map)

- [ ] **Step 1: Write the failing tests**

For each of the 5 handler test files, write at least one test per tool covering the dispatch + return-shape pattern. Example for `src/test/tools/handlers/cards.test.ts` (template — apply identically for every tool in the migration table):

```ts
import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/cards.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(overrides: Partial<BasecampClient> = {}): BasecampClient {
  return {
    getCards: vi.fn(),
    createCard: vi.fn(),
    getCard: vi.fn(),
    updateCard: vi.fn(),
    moveCard: vi.fn(),
    completeCard: vi.fn(),
    getCardSteps: vi.fn(),
    createCardStep: vi.fn(),
    completeCardStep: vi.fn(),
    ...overrides,
  } as unknown as BasecampClient;
}

describe('cards handlers', () => {
  it('get_cards: forwards (project_id, column_id) and returns count', async () => {
    const client = makeMockClient();
    (client.getCards as any).mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const result = await handlers.get_cards({ project_id: '100', column_id: '5' }, client);
    expect(client.getCards).toHaveBeenCalledWith('100', '5');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.cards).toHaveLength(2);
    expect(parsed.count).toBe(2);
  });

  // ...one test per tool for the rest of the file:
  // create_card, get_card, update_card, move_card, complete_card,
  // get_card_steps, create_card_step, complete_card_step.
  // Each: mock the client method, dispatch through handlers.<tool_name>,
  // assert URL params + success envelope.
});
```

For each of the 11 wire-up fixes, the test asserts the new handler exists and dispatches correctly — these tests would have failed before this step because the case never existed.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/test/tools/handlers/`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement each handler module**

For each handler file, the body is mechanical — pull args, call the matching `BasecampClient` method, wrap in `successResult`. Use the existing case bodies in `src/tools/dispatch.ts` (created in Task 3a.2) as the source of truth for argument shapes; copy them into per-handler functions.

Example shape (full file, for `handlers/cards.ts`):

```ts
import type { BasecampClient } from '../../lib/basecamp-client.js';
import type { MCPToolResultEnvelope } from '../result.js';
import { successResult } from '../result.js';

async function getCards(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const cards = await c.getCards(args.project_id, args.column_id);
  return successResult({ cards, count: cards.length });
}

async function createCard(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const card = await c.createCard(
    args.project_id, args.column_id, args.title, args.content, args.due_on, args.notify ?? false,
  );
  return successResult({ card, message: `Card '${args.title}' created successfully` });
}

async function getCard(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const card = await c.getCard(args.project_id, args.card_id);
  return successResult({ card });
}

async function updateCard(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const card = await c.updateCard(
    args.project_id, args.card_id, args.title, args.content, args.due_on, args.assignee_ids,
  );
  return successResult({ card, message: `Card updated` });
}

// ... move_card, complete_card, get_card_steps, create_card_step, complete_card_step ...

export const handlers = {
  get_cards: getCards,
  create_card: createCard,
  get_card: getCard,
  update_card: updateCard,
  move_card: moveCard,
  complete_card: completeCard,
  get_card_steps: getCardSteps,
  create_card_step: createCardStep,
  complete_card_step: completeCardStep,
} as const;
```

Apply the same pattern for `columns.ts`, `documents.ts`, `webhooks.ts`, `misc.ts`. The argument shapes are visible in the existing tool registrations (in `src/tools/registrations.ts` from Task 3a.2) and the existing case bodies (in `src/tools/dispatch.ts` from Task 3a.2). Pay particular attention to the 11 wire-up fixes — those have no existing case bodies; consult the matching `BasecampClient` method signature directly.

For the `get_card_table` handler in `columns.ts`, replace the existing two-call sequence (`getCardTable` + `getCardTableDetails`) with a single call to the new `getCardTableWithDetails` method added in Chunk 1 Task 1.5:

```ts
async function getCardTable(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const card_table = await c.getCardTableWithDetails(args.project_id);
  return successResult({ card_table });
}
```

**Worked example for `move_column` — argument-ordering trap.** The `BasecampClient.moveColumn` signature is `moveColumn(projectId, columnId, position, cardTableId)` — `cardTableId` is the **fourth** parameter, not the second. The MCP tool registration takes `(project_id, card_table_id, column_id, position)`. Do not assume positional alignment; map by name:

```ts
async function moveColumn(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  await c.moveColumn(args.project_id, args.column_id, args.position, args.card_table_id);
  return successResult({ message: `Column moved to position ${args.position}` });
}
```

When in doubt for any wire-up fix, look up the method signature in `src/lib/basecamp-client.ts` and map by argument name; positional ordering inside the method is not always the same as positional ordering of the MCP tool's input schema.

**Soft cap on `misc.ts`.** It will hold ~15 tools. Average handler is ~12 lines, so total ~180 lines — under the 400-line soft cap. If during implementation it crosses **250 lines** (e.g., because `get_assignments_for_person` and `get_my_due_assignments` carry larger arg-shaping bodies than expected), split it into `misc/{projects,people,assignments,checkins}.ts` and re-export the merged `handlers` from `misc/index.ts`. This is a precautionary instruction, not a blocking one.

- [ ] **Step 4: Replace the dispatch switch with the merged map**

Open `src/tools/dispatch.ts`. Delete the entire `switch` body. Replace `dispatch` with a lookup-based version:

```ts
import type { BasecampClient } from '../lib/basecamp-client.js';
import { errorResult, type MCPToolResultEnvelope } from './result.js';
import { handlers as cards } from './handlers/cards.js';
import { handlers as columns } from './handlers/columns.js';
import { handlers as documents } from './handlers/documents.js';
import { handlers as webhooks } from './handlers/webhooks.js';
import { handlers as misc } from './handlers/misc.js';

type Handler = (args: Record<string, any>, client: BasecampClient) => Promise<MCPToolResultEnvelope>;

const ALL_HANDLERS: Record<string, Handler> = {
  ...cards,
  ...columns,
  ...documents,
  ...webhooks,
  ...misc,
};

export async function dispatch(
  name: string,
  args: Record<string, any>,
  client: BasecampClient,
): Promise<MCPToolResultEnvelope> {
  const handler = ALL_HANDLERS[name];
  if (!handler) return errorResult(`Unknown tool: ${name}`);
  try {
    return await handler(args, client);
  } catch (error: any) {
    if (error.response?.status === 401 && error.response?.data?.error?.includes('expired')) {
      return errorResult('Your Basecamp OAuth token has expired. Please re-authenticate: npm run auth', {
        error: 'OAuth token expired',
      });
    }
    if (error.response?.status === 422) {
      return errorResult(error.response?.data?.error ?? error.message, {
        error: 'Validation error',
        status: 422,
      });
    }
    return errorResult(error.message ?? 'Unknown error', { error: 'Execution error' });
  }
}
```

Note the new 422 case — surfaces BC3 validation errors verbatim (per spec §4).

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: PASS — every existing tool still dispatches; the 11 newly-wired tools now resolve via `handlers.<name>` lookup.

- [ ] **Step 6: Run the build**

Run: `npm run build`
Expected: No type errors.

- [ ] **Step 7: Spot-check a wire-up fix manually**

Earlier this tool would fail. Now it should succeed (against a real account) — but as a smoke test we can verify dispatch routing without the real network call:

```bash
node -e "
const { dispatch } = require('./dist/tools/dispatch.js');
const fakeClient = { getWebhooks: async () => [{ id: 'w1' }] };
dispatch('get_webhooks', { project_id: '1' }, fakeClient).then(r => console.log(r.content[0].text));
"
```

Expected output: a JSON envelope with `status: 'success'` and `webhooks: [{ id: 'w1' }]`.

- [ ] **Step 8: Confirm dispatch.ts size**

Run: `wc -l src/tools/dispatch.ts`
Expected: under 80 lines (was effectively the entire switch; now a 5-line lookup map plus the catch helper).

- [ ] **Step 9: Commit**

```bash
git add src/tools/handlers/ src/tools/dispatch.ts src/test/tools/handlers/
git commit -m "refactor(tools): split dispatch into per-resource handlers + wire 11 missing tools"
```

---

### Task 3a.4: Verify Chunk 3a

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS — every test green. New test count for Chunk 3a: 3 result + 2 dispatch + ≥30 handler-dispatch tests (11 wire-up fixes + ~25 existing tools across 5 files) = 35+ new tests.

- [ ] **Step 2: Run the build**

Run: `npm run build`
Expected: No type errors.

- [ ] **Step 3: Confirm file sizes**

Run: `wc -l src/index.ts src/tools/*.ts src/tools/handlers/*.ts`
Expected: Every file under the 400-line soft cap; `src/index.ts` under 200; total handler files reasonable in size (each ~80-200 lines).

- [ ] **Step 4: Confirm no advertised tool returns `Unknown tool`**

Run: `grep -E "name: '[a-z_]+'" src/tools/registrations.ts | sed -E "s/.*name: '([a-z_]+)'.*/\1/" | sort -u`
Cross-reference each line against the merged keys of `ALL_HANDLERS` in `src/tools/dispatch.ts` (every `handlers/*.ts` export). The two sets must match exactly. A registered tool with no handler entry will silently return `Unknown tool`; a handler entry with no registration is dead code.

End of Chunk 3a.
