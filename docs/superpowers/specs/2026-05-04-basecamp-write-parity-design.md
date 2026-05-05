# Basecamp MCP Write Parity — Design

**Status:** Draft for implementation
**Date:** 2026-05-04
**Scope:** Bring write capability up to read parity for the resources the user actively uses.

---

## 1. Problem & Goal

The Basecamp MCP server currently has rich read tools (`get_my_assignments`, `get_assignments_for_person`, `get_todos`, `get_messages`-via-search, etc.) but the write surface is limited to card-table operations and a handful of document/webhook calls. Several of those write tools are even *advertised in `setupHandlers`'s tool list but missing from the request switch*, so calling them returns `Unknown tool`. The goal is to bring create/update/delete (trash/archive) parity to the BC3 resources the user actually works with, while testing strictly against new items the suite creates itself — never against pre-existing items in the user's account.

**In scope (this round):** todos, todolists, comments, messages, schedule entries.
**Out of scope (this round):** campfire lines, generic recordings tool, uploads/attachments. Uploads need their own design (binary body handling, MIME detection, file-source UX) and will be brainstormed separately.

---

## 2. Tool Surface

All tool names use snake_case to match the existing convention. All tools take `project_id` as a string. Status changes use a single per-resource tool with a status enum (one tool replaces three discrete verbs) to keep the surface small and maintainable.

### 2.1 Todos (6 tools)

| Tool | Maps to |
|---|---|
| `get_todo(project_id, todo_id)` | `GET /buckets/{project_id}/todos/{todo_id}.json` |
| `create_todo(project_id, todolist_id, content, description?, assignee_ids?, completion_subscriber_ids?, due_on?, starts_on?, notify?)` | `POST /buckets/{project_id}/todolists/{todolist_id}/todos.json` |
| `update_todo(project_id, todo_id, content?, description?, assignee_ids?, completion_subscriber_ids?, due_on?, starts_on?, notify?)` | `PUT /buckets/{project_id}/todos/{todo_id}.json` (update strategy: `'full'` — see §3.3) |
| `complete_todo(project_id, todo_id)` | `POST /buckets/{project_id}/todos/{todo_id}/completion.json` |
| `uncomplete_todo(project_id, todo_id)` | `DELETE /buckets/{project_id}/todos/{todo_id}/completion.json` |
| `reposition_todo(project_id, todo_id, position, parent_id?)` | `PUT /buckets/{project_id}/todos/{todo_id}/position.json` |

### 2.2 Todolists (3 tools)

| Tool | Maps to |
|---|---|
| `get_todolist(project_id, todolist_id)` | `GET /buckets/{project_id}/todolists/{todolist_id}.json` |
| `create_todolist(project_id, todoset_id, name, description?)` | `POST /buckets/{project_id}/todosets/{todoset_id}/todolists.json` |
| `update_todolist(project_id, todolist_id, name?, description?)` | `PUT /buckets/{project_id}/todolists/{todolist_id}.json` (update strategy: `'full'` — see §3.3) |

### 2.3 Comments (3 tools)

| Tool | Maps to |
|---|---|
| `get_comment(project_id, comment_id)` | `GET /buckets/{project_id}/comments/{comment_id}.json` |
| `create_comment(project_id, recording_id, content)` | `POST /buckets/{project_id}/recordings/{recording_id}/comments.json` |
| `update_comment(project_id, comment_id, content)` | `PUT /buckets/{project_id}/comments/{comment_id}.json` (update strategy: `'partial'` — single-field whitelist, no merge needed; see §3.3) |

### 2.4 Messages (5 tools)

| Tool | Maps to |
|---|---|
| `get_message_board(project_id)` | Resolves `message_board` entry from `/projects/{project_id}.json` dock, then fetches full details via `GET /buckets/{project_id}/message_boards/{message_board_id}.json` (mirrors the existing `get_card_table` two-step pattern). |
| `get_messages(project_id, message_board_id)` | `GET /buckets/{project_id}/message_boards/{message_board_id}/messages.json` |
| `get_message(project_id, message_id)` | `GET /buckets/{project_id}/messages/{message_id}.json` |
| `create_message(project_id, message_board_id, subject, content?, category_id?, subscriptions?)` | `POST /buckets/{project_id}/message_boards/{message_board_id}/messages.json`. Always sends `status: 'active'` — drafts have no use case from an LLM caller, so the parameter is not exposed. |
| `update_message(project_id, message_id, subject?, content?, category_id?)` | `PUT /buckets/{project_id}/messages/{message_id}.json` (update strategy: `'full'` — see §3.3) |

### 2.5 Schedule entries (5 tools)

| Tool | Maps to |
|---|---|
| `get_schedule(project_id)` | Resolves `schedule` entry from `/projects/{project_id}.json` dock, then fetches full details via `GET /buckets/{project_id}/schedules/{schedule_id}.json` (mirrors `get_card_table`). |
| `get_schedule_entries(project_id, schedule_id)` | `GET /buckets/{project_id}/schedules/{schedule_id}/entries.json` |
| `get_schedule_entry(project_id, entry_id)` | `GET /buckets/{project_id}/schedule_entries/{entry_id}.json` |
| `create_schedule_entry(project_id, schedule_id, summary, starts_at, ends_at, description?, participant_ids?, all_day?, notify?)` | `POST /buckets/{project_id}/schedules/{schedule_id}/entries.json` |
| `update_schedule_entry(project_id, entry_id, summary?, starts_at?, ends_at?, description?, participant_ids?, all_day?, notify?)` | `PUT /buckets/{project_id}/schedule_entries/{entry_id}.json` (update strategy: `'full'` — see §3.3) |

### 2.6 Status changes (5 tools)

One tool per resource; status enum collapses trash/archive/unarchive into a single verb.

| Tool | Status values |
|---|---|
| `set_todo_status(project_id, todo_id, status)` | `'active'` (unarchive), `'archived'`, `'trashed'` |
| `set_todolist_status(project_id, todolist_id, status)` | same |
| `set_message_status(project_id, message_id, status)` | same |
| `set_comment_status(project_id, comment_id, status)` | same |
| `set_schedule_entry_status(project_id, entry_id, status)` | same |

All five dispatch to `setRecordingStatus(project_id, recording_id, status)`, which maps to `PUT /buckets/{project_id}/recordings/{recording_id}/status/{status}.json`.

**Per-resource framing is a UX hint, not enforcement.** The five tools are functionally interchangeable under the hood — `set_todo_status(project_id, comment_id, 'trashed')` will happily trash a comment because BC3's recording-status endpoint is type-agnostic. Per-resource naming exists to give the LLM caller a clearer hook ("this is the trash-a-todo verb") and to keep tool descriptions honest about which resource they're documented for. We don't add a runtime "is this ID actually a Todo?" check because BC3 doesn't expose a cheap way to verify resource type without an extra GET, and getting the wrong tool name does no real harm — the user-visible result is the same trash/archive operation.

**Idempotency.** Calling `set_*_status(id, 'trashed')` on an already-trashed recording is a no-op success in BC3 (returns 204). The handlers do not pre-check current status; the BC3 endpoint is the source of truth. Tests cover the idempotent case with a `setStatus → setStatus` lifecycle assertion.

### 2.7 Wire-up bug fix (no design — bundled cleanup)

The following tools are already advertised in `setupHandlers`'s tool list but missing from the request switch in `src/index.ts`. Their client methods exist; only the dispatch is missing. Bundled here because they block legitimate use today:

`update_card`, `update_column`, `move_column`, `update_column_color`, `get_card`, `update_document`, `trash_document`, `get_uploads`, `get_webhooks`, `create_webhook`, `delete_webhook`.

**Total new tools:** 22 new behaviors + 5 status verbs = 27 new tools, plus 11 wire-up fixes.

---

## 3. Architecture

Three layers, mirroring the existing structure. The aim is **maintainability** — small focused files, clear boundaries, no behaviour leaking across resources.

### 3.1 `BasecampClient` split into resource modules

`src/lib/basecamp-client.ts` is currently ~600 lines and would push past the 800-line guideline if all new methods were added inline. Split per resource:

```
src/lib/
  basecamp-client.ts        # facade + axios setup + auth + cross-cutting helpers
  resources/
    todos.ts                # todo create/update/complete/etc.
    todolists.ts            # todolist create/update/get
    comments.ts             # comment create/update/get
    messages.ts             # message + message_board create/update/get
    schedule.ts             # schedule + schedule_entry create/update/get
    recording-status.ts     # the single setRecordingStatus method
    dock.ts                 # getDockEntryWithDetails — shared by card_table, message_board, schedule
  update-merge.ts           # the fetch-then-merge helper
  pagination.ts             # parseNextLink + walkPaginated (extracted from basecamp-client.ts)
```

**Dock-entry pattern, extracted (rule of three).** `get_card_table` already does "fetch project → find dock entry by name → fetch details endpoint". `get_message_board` and `get_schedule` would be the second and third instance — that's the threshold for extraction:

```ts
// src/lib/resources/dock.ts
export async function getDockEntryWithDetails<T>(
  client: AxiosInstance,
  projectId: string,
  dockName: string,
  detailsPath: (projectId: string, entryId: string) => string,
): Promise<T> {
  const project = await getProject(client, projectId);
  const entry = project.dock.find((d) => d.name === dockName);
  if (!entry) {
    throw new Error(`No ${dockName} dock entry found for project ${projectId}`);
  }
  const response = await client.get(detailsPath(projectId, String(entry.id)));
  return response.data;
}
```

`getCardTable`, `getMessageBoard`, and `getSchedule` become three-line callers. The existing `getCardTable` in `basecamp-client.ts` is rewritten to use this helper as part of the wire-up cleanup so we don't leave the pattern duplicated.

Each `resources/*.ts` file exports plain functions with a uniform signature: `(client: AxiosInstance, ...args) => Promise<T>`. `BasecampClient` keeps its current public method shape and delegates to the resource functions. Existing methods (cards, projects, my-assignments, comments, documents, etc.) stay where they are in `basecamp-client.ts`; we don't move them in this round to keep the diff bounded.

**Facade pattern** — the new methods on `BasecampClient` are one-line delegations:

```ts
// src/lib/resources/todos.ts
export async function createTodo(
  client: AxiosInstance,
  projectId: string,
  todolistId: string,
  body: CreateTodoBody,
): Promise<Todo> {
  const response = await client.post(
    `/buckets/${projectId}/todolists/${todolistId}/todos.json`,
    body,
  );
  return response.data;
}

// src/lib/basecamp-client.ts
import * as todos from './resources/todos.js';

export class BasecampClient {
  // ...existing methods unchanged...

  createTodo(projectId: string, todolistId: string, body: CreateTodoBody) {
    return todos.createTodo(this.client, projectId, todolistId, body);
  }
}
```

**Why functions, not classes?** Each resource module has no state of its own — just HTTP calls against the shared axios instance. Free functions are easier to test in isolation (no fixture setup beyond a mock axios instance) and easier to read.

### 3.2 MCP tool layer — split per resource

`src/index.ts` currently houses both a ~500-line tool-registration list and a ~50-case switch for dispatch. Adding 27 + 11 = ~38 more cases would push the switch past 90 entries — the kind of file you stop reading and start grepping. Relocating the bloat to a single `handlers.ts` would not fix the smell, only move it. The spec instead splits handlers per-resource so each file is a single-responsibility unit you can read end-to-end:

```
src/tools/
  index.ts                # public exports: { tools, dispatch }
  registrations.ts        # the schema/description array (one big literal is fine; it's data)
  dispatch.ts             # { [toolName]: handlerFn } lookup map; ~60 lines of routing
  handlers/
    todos.ts              # exports handleCreateTodo, handleUpdateTodo, handleCompleteTodo, ...
    todolists.ts
    comments.ts
    messages.ts
    schedule.ts
    recording-status.ts   # the five set_*_status handlers
    cards.ts              # existing card handlers move here (wire-up bug fix happens here)
    columns.ts            # existing column handlers move here
    documents.ts          # existing document handlers move here
    webhooks.ts           # existing + the create/delete handlers (wire-up fix)
    misc.ts               # search, profile, my-assignments, people, daily check-ins
```

Each `handlers/*.ts` file exports a map of `(args, client) => Promise<MCPToolResult>` handlers. `dispatch.ts` merges those maps into a single name→handler lookup. `src/index.ts` becomes a thin bootstrapping shell that constructs the server, wires `tools` into the list-tools handler, and routes call-tool requests through `dispatch`.

Adding a new tool means: one entry in `registrations.ts`, one handler in the appropriate `handlers/*.ts`, one line in `dispatch.ts`. All small, all in obvious places. The mega-switch is gone.

**Soft cap:** if any single handler file crosses 400 lines, split it (e.g., `handlers/todos.ts` → `handlers/todos/{create,update,complete,reposition}.ts`). The 800-line guideline is the hard limit; 400 is the trigger for a precautionary split.

### 3.3 `update-merge.ts` — the fetch-then-merge helper

BC3's PUT semantics vary by resource. Todos and todolists' docs explicitly require all fields on PUT ("omitting a parameter will clear its value"); comments, messages, and schedule entries do not document the same constraint. To make our `update_*` tools behave like PATCH (what an LLM caller expects) without sending data we don't need to send, the helper supports two strategies, picked per resource:

- **`'full'`** — fetch the current resource, overlay the patch, PUT the whitelisted union. Required for resources that demand full payloads (todos, todolists). Also chosen as the safe default for messages and schedule entries until BC3's behaviour is verified end-to-end.
- **`'partial'`** — skip the fetch, PUT just the patch. Used for comments (whitelist is one field; merge is degenerate).

The helper splits the *body* type from the *resource* type so the compiler stays honest — no `as T` cast pretending a body is a resource:

```ts
// src/lib/update-merge.ts

export type MergeStrategy = 'full' | 'partial';

export async function applyUpdate<TResource extends object, TBody extends object>(
  strategy: MergeStrategy,
  patch: Partial<TBody>,
  fetchCurrent: () => Promise<TResource>,
  put: (body: Partial<TBody>) => Promise<TResource>,
  whitelist: ReadonlyArray<keyof TBody & keyof TResource>,
): Promise<TResource> {
  if (Object.keys(patch).length === 0) {
    return fetchCurrent();              // empty patch: don't waste a write
  }

  if (strategy === 'partial') {
    return put(patch);                  // single-field resources, no merge needed
  }

  const existing = await fetchCurrent();
  const body: Partial<TBody> = {};
  for (const key of whitelist) {
    const fromPatch = patch[key];
    body[key] = fromPatch !== undefined
      ? fromPatch
      : (existing as unknown as TBody)[key];
  }
  return put(body);
}
```

**Type honesty.** `TResource` is the full BC3 record (`Todo`, `Message`, etc.); `TBody` is the wire-shape sent on PUT (`TodoUpdateBody`, `MessageUpdateBody`, etc.). The `keyof TBody & keyof TResource` constraint guarantees whitelist names exist on both sides at compile time. There's still one unavoidable cast (`existing as unknown as TBody`) because the BC3 record carries fields the body doesn't (`id`, `created_at`, etc.), but the cast is local and obvious instead of being smuggled into the return type.

**Whitelists, body types, and strategies per resource:**

| Resource | Strategy | PUT whitelist (= `TBody` keys) |
|---|---|---|
| Todo | `'full'` | `content`, `description`, `assignee_ids`, `completion_subscriber_ids`, `due_on`, `starts_on`, `notify` |
| Todolist | `'full'` | `name`, `description` |
| Comment | `'partial'` | `content` |
| Message | `'full'` | `subject`, `content`, `category_id` |
| Schedule entry | `'full'` | `summary`, `description`, `starts_at`, `ends_at`, `participant_ids`, `all_day`, `notify` |

**Concurrent-write race — acknowledged, not solved.** For `'full'`-strategy resources, two concurrent `update_*` calls against the same record can race: caller A's GET-then-PUT can clobber caller B's update for any field A didn't supply. BC3 exposes no ETag / If-Match concurrency primitive AFAIK, so we cannot prevent this at the HTTP layer. We accept the race because the agent-driven workflows we expect are sequential, and a per-request mutex inside the MCP server would not help across multiple MCP server processes anyway. This trade-off is documented here so future readers don't assume the merge handles it.

**Empty-patch short-circuit.** `update_todo({})` skips the PUT entirely and returns the current record from the GET. No wasted round-trip, and the tool still returns a sensible result.

**`null` semantics.** `null` is **not** treated as "clear this field" in this round; a `null` patch value is read by the helper the same as `undefined` (leave alone). If a future use case needs explicit clearing, we add a sentinel then.

**Parameter array typing.** `assignee_ids`, `completion_subscriber_ids`, `participant_ids`, and `subscriptions` are typed `Array<number | string>` throughout — BC3 returns numeric IDs but accepts string-coerced ones, and the LLM caller may have either.

### 3.4 Routes — bucket-scoped

All new routes use the legacy `/buckets/{project_id}/...` form for consistency with the existing client. BC3's flat routes are documented but not required, and switching the codebase over is unrelated churn.

---

## 4. Error handling

Reuse the existing `handleError` in `src/index.ts`. Two refinements:

- **422 Unprocessable Entity** (BC3 validation errors — empty `content` on todo, missing `subject` on message, invalid status value, etc.) is surfaced verbatim to the caller. Today these get collapsed into a generic `Execution error`, which is unhelpful — the LLM caller can't see what was wrong.
- **404 on the fetch step of fetch-then-merge** returns a clean `Resource not found: {resource_type} {id}` error instead of crashing the merge with `Cannot read properties of undefined`.

No other changes to the error-handling pattern.

---

## 5. Testing

### 5.1 Mock-based tests (CI, every push)

One vitest file per resource, mirroring `src/test/basecamp-client.test.ts`'s axios-mock pattern:

- `src/test/resources/todos.test.ts`
- `src/test/resources/todolists.test.ts`
- `src/test/resources/comments.test.ts`
- `src/test/resources/messages.test.ts`
- `src/test/resources/schedule.test.ts`
- `src/test/resources/recording-status.test.ts`
- `src/test/resources/dock.test.ts` (covers the new `getDockEntryWithDetails` helper)
- `src/test/lib/update-merge.test.ts` (full + partial strategies, empty-patch short-circuit, whitelist filtering, type honesty against a fixture body type)
- `src/test/lib/pagination.test.ts` (covers the extracted `parseNextLink` / `walkPaginated`)
- `src/test/tools/handlers/{todos,todolists,comments,messages,schedule,recording-status,cards,columns,documents,webhooks,misc}.test.ts` — one file per handler module covering tool dispatch, mirroring the handler layout from Section 3.2. Replaces the "additions to `mcp-server.test.ts`" pattern, which would have ballooned the same way the switch did.

Each resource test asserts:
1. URL, HTTP method, and body shape for every call.
2. `update_*` tools issue a GET *before* the PUT.
3. Merge logic preserves omitted fields and overrides supplied fields.
4. Whitelist filtering excludes read-only fields from the PUT body.

CI coverage target stays at 80%+ (existing project standard).

### 5.2 Live verification (`npm run test:live`, manual only)

A separate vitest config (`vitest.live.config.ts`) excluded from the default `npm test` run. Triggered explicitly by the developer when verifying against a real Basecamp account.

**Safety guardrails (multiple layers):**

1. **Sandbox-only via env var.** Refuses to run unless `BASECAMP_TEST_PROJECT_ID` is set.
2. **Project-name guard.** At startup, fetches the test project via `GET /projects/{id}.json` and asserts its name contains a sentinel string. Default sentinel is `MCP_TEST_SANDBOX`; overrideable via `BASECAMP_TEST_PROJECT_NAME_GUARD`. If the guard string is absent, the suite refuses to write *anything* and exits with a clear message.
3. **Title prefix on every artifact.** Every created todo / todolist / message / comment / schedule entry gets a `[mcp-test-{run-id}]` prefix in its title or content, where `run-id` is a per-run UUID. Trashed at end-of-run.
4. **Captured-IDs-only teardown, persisted to disk.** Every created ID is appended to `.test-live-ids-{run-id}.json` *as it is created*, before the test continues. Teardown reads the file and trashes each ID. If the test crashes mid-run, the file survives — a separate `npm run test:live:cleanup` command reads any leftover `.test-live-ids-*.json` files and trashes their IDs. Without disk persistence, captured IDs would die with the test process and the leak audit would be the only safety net; this puts the cleanup path back in operator control.
5. **Leak audit at end of run.** After teardown, the suite iterates `/projects/recordings.json?bucket={test_project_id}&type={t}` for each `t` in `['Todo', 'Todolist', 'Message', 'Comment', 'Schedule::Entry']` and warns if any active item with the test prefix is still present. The audit walks pagination using the existing `parseNextLink` helper (extracted to `src/lib/pagination.ts` per Section 3.1) — a single-page audit would silently miss leaked items in projects with more than ~25 recordings of a type. (Should never fire — defense in depth.)

**Per-resource lifecycle test:**
```
create with prefixed title
append created ID to .test-live-ids-{run-id}.json
GET back, assert fields match what we sent
update one field via partial patch
GET back, assert:
  - the patched field changed
  - for 'full'-strategy resources: every other field is preserved (proves merge works)
  - for 'partial'-strategy resources: every other field is unchanged on the server side
set status to 'trashed' (idempotent — call twice, second call must succeed)
GET back, assert status === 'trashed'
```

**Manual operator step (one-time, after implementation lands):**
1. Create a Basecamp project named e.g. `MCP Write Test Sandbox`.
2. Add `BASECAMP_TEST_PROJECT_ID=...` to `.env.local`.
3. Run `npm run test:live`.
4. Visually inspect the project in Basecamp's UI to confirm only `[mcp-test-...]` items were created and that they're now in the trash.
5. If the test crashed mid-run, run `npm run test:live:cleanup` to trash any IDs left in `.test-live-ids-*.json` files. After successful cleanup the `.json` files are removed.

The mock suite alone proves nothing about the real BC3 API; the live suite alone is too slow and too credential-dependent for CI. Together they give regression coverage and ground-truth verification.

---

## 6. What is *not* in this round

- **Uploads / attachments.** Needs binary-body handling, MIME detection, file-source UX (path vs URL vs base64). Separate brainstorm + spec.
- **Campfire lines.** User confirmed not used.
- **Generic recording tool** (a single `set_recording_status(project_id, recording_id, type, status)` exposing the underlying endpoint without per-resource framing). User confirmed not wanted; per-resource tools are clearer for an LLM.
- **Refactoring existing code unrelated to writes.** Card/document/webhook implementations stay as-is; only the wire-up bug fix touches them.
- **Switching to BC3's flat routes** (`/todos/{id}.json` instead of `/buckets/{p}/todos/{id}.json`). Both are supported; consistency with the existing client wins.
- **Explicit-clear sentinel in fetch-then-merge.** Add when a real use case needs it.

---

## 7. Acceptance criteria

- All 27 new tools exist, are registered in `src/tools/registrations.ts`, dispatched via `src/tools/dispatch.ts`, implemented in the appropriate `src/tools/handlers/*.ts`, and pass mock-based unit tests with ≥80% coverage on the new code.
- All 11 wire-up fixes turn previously-broken `Unknown tool` calls into working dispatches with their own mock test coverage in their relocated handler files.
- `update-merge.ts` has its own focused test file proving the `'full'` and `'partial'` strategies, the empty-patch short-circuit, whitelist filtering, and (via a fixture body type) the `keyof TBody & keyof TResource` constraint.
- `getDockEntryWithDetails` is the single source of dock-entry-with-details lookups; the existing `getCardTable` is rewritten to use it (no remaining duplicated dance).
- `npm run test:live` runs end-to-end against a sandbox project and exits 0; a visual inspection of the sandbox project shows only prefixed test artifacts, all trashed.
- `npm run test:live:cleanup` reads any leftover `.test-live-ids-*.json` files and trashes their IDs; runs idempotently.
- `npm test` (mocks-only) passes in CI.
- No existing test regresses.
- No file in `src/` exceeds 800 lines, and no handler file exceeds the 400-line soft cap (split if it would).
- `npm run build` (which runs `tsc`) passes with no type errors. Crucially: no `as T` casts in the merge helper's return type, in any handler, or in any call site. The single local `existing as unknown as TBody` cast inside the helper body — needed because the BC3 record carries fields the body type doesn't — is the only acceptable cast and must remain narrowly scoped.
