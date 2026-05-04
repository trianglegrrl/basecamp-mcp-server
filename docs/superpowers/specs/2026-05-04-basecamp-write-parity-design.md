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
| `update_todo(project_id, todo_id, content?, description?, assignee_ids?, completion_subscriber_ids?, due_on?, starts_on?, notify?)` | `PUT /buckets/{project_id}/todos/{todo_id}.json` (fetch-then-merge) |
| `complete_todo(project_id, todo_id)` | `POST /buckets/{project_id}/todos/{todo_id}/completion.json` |
| `uncomplete_todo(project_id, todo_id)` | `DELETE /buckets/{project_id}/todos/{todo_id}/completion.json` |
| `reposition_todo(project_id, todo_id, position, parent_id?)` | `PUT /buckets/{project_id}/todos/{todo_id}/position.json` |

### 2.2 Todolists (3 tools)

| Tool | Maps to |
|---|---|
| `get_todolist(project_id, todolist_id)` | `GET /buckets/{project_id}/todolists/{todolist_id}.json` |
| `create_todolist(project_id, todoset_id, name, description?)` | `POST /buckets/{project_id}/todosets/{todoset_id}/todolists.json` |
| `update_todolist(project_id, todolist_id, name?, description?)` | `PUT /buckets/{project_id}/todolists/{todolist_id}.json` (fetch-then-merge) |

### 2.3 Comments (3 tools)

| Tool | Maps to |
|---|---|
| `get_comment(project_id, comment_id)` | `GET /buckets/{project_id}/comments/{comment_id}.json` |
| `create_comment(project_id, recording_id, content)` | `POST /buckets/{project_id}/recordings/{recording_id}/comments.json` |
| `update_comment(project_id, comment_id, content)` | `PUT /buckets/{project_id}/comments/{comment_id}.json` (fetch-then-merge) |

### 2.4 Messages (5 tools)

| Tool | Maps to |
|---|---|
| `get_message_board(project_id)` | Resolves `message_board` entry from `/projects/{project_id}.json` dock, then fetches full details via `GET /buckets/{project_id}/message_boards/{message_board_id}.json` (mirrors the existing `get_card_table` two-step pattern). |
| `get_messages(project_id, message_board_id)` | `GET /buckets/{project_id}/message_boards/{message_board_id}/messages.json` |
| `get_message(project_id, message_id)` | `GET /buckets/{project_id}/messages/{message_id}.json` |
| `create_message(project_id, message_board_id, subject, content?, category_id?, subscriptions?)` | `POST /buckets/{project_id}/message_boards/{message_board_id}/messages.json`. Always sends `status: 'active'` — drafts have no use case from an LLM caller, so the parameter is not exposed. |
| `update_message(project_id, message_id, subject?, content?, category_id?)` | `PUT /buckets/{project_id}/messages/{message_id}.json` (fetch-then-merge) |

### 2.5 Schedule entries (5 tools)

| Tool | Maps to |
|---|---|
| `get_schedule(project_id)` | Resolves `schedule` entry from `/projects/{project_id}.json` dock, then fetches full details via `GET /buckets/{project_id}/schedules/{schedule_id}.json` (mirrors `get_card_table`). |
| `get_schedule_entries(project_id, schedule_id)` | `GET /buckets/{project_id}/schedules/{schedule_id}/entries.json` |
| `get_schedule_entry(project_id, entry_id)` | `GET /buckets/{project_id}/schedule_entries/{entry_id}.json` |
| `create_schedule_entry(project_id, schedule_id, summary, starts_at, ends_at, description?, participant_ids?, all_day?, notify?)` | `POST /buckets/{project_id}/schedules/{schedule_id}/entries.json` |
| `update_schedule_entry(project_id, entry_id, summary?, starts_at?, ends_at?, description?, participant_ids?, all_day?, notify?)` | `PUT /buckets/{project_id}/schedule_entries/{entry_id}.json` (fetch-then-merge) |

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
  update-merge.ts           # the fetch-then-merge helper
```

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

### 3.2 MCP tool layer (`src/index.ts`)

Same pattern as today: register tool in the `ListToolsRequestSchema` handler, add a switch case in the `CallToolRequestSchema` handler. The 27 new + 11 wire-up cases will push `index.ts` past the 800-line guideline. To stay maintainable:

- Tool *registrations* (the schema/description blocks) move into `src/tools/registrations.ts` — one big array exported as `tools`.
- Tool *handlers* (the switch cases) move into `src/tools/handlers.ts` — one large dispatch function `dispatchTool(name, args, client) => Promise<MCPToolResult>`.
- `src/index.ts` becomes a thin server-bootstrapping shell that wires the handlers up.

### 3.3 `update-merge.ts` — the fetch-then-merge helper

Single 30-line utility used by every PUT-based update tool. BC3's PUT semantics are full-replacement: omitting a field clears it. To make our `update_*` tools behave like PATCH (which is what an LLM caller naively expects), we GET the current state, merge the patch on top, then PUT the union.

```ts
export async function mergeUpdate<T extends object>(
  current: () => Promise<T>,
  patch: Partial<T>,
  put: (full: T) => Promise<T>,
  whitelist: ReadonlyArray<keyof T>,
): Promise<T> {
  const existing = await current();
  const merged = { ...existing, ...patch };
  const filtered = Object.fromEntries(
    whitelist.map((k) => [k, merged[k]]),
  ) as T;
  return put(filtered);
}
```

`whitelist` is the set of fields BC3 accepts on PUT for that resource. The whitelist prevents read-only fields (`id`, `created_at`, `creator`, `bucket`, etc.) from leaking into the PUT body. The five whitelists for this round, derived from the BC3 docs:

| Resource | PUT whitelist |
|---|---|
| Todo | `content`, `description`, `assignee_ids`, `completion_subscriber_ids`, `due_on`, `starts_on`, `notify` |
| Todolist | `name`, `description` |
| Comment | `content` |
| Message | `subject`, `content`, `category_id` |
| Schedule entry | `summary`, `description`, `starts_at`, `ends_at`, `participant_ids`, `all_day`, `notify` |

`null` is **not** treated as "clear the field" in this round. If a future use case needs explicit clearing, we can add a sentinel; for now `null` and `undefined` both mean "leave alone".

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
- `src/test/lib/update-merge.test.ts`
- Additions to `src/test/mcp-server.test.ts` covering the 27 new tools and 11 wire-up fixes.

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
4. **Captured-IDs-only teardown.** Teardown trashes only IDs that the test suite itself created. No "list everything in the project and trash it" pattern.
5. **Leak audit at end of run.** After teardown, the suite iterates `/projects/recordings.json?bucket={test_project_id}&type={t}` for each `t` in `['Todo', 'Todolist', 'Message', 'Comment', 'Schedule::Entry']` and warns if any active item with the test prefix is still present. (Should never fire — defense in depth.)

**Per-resource lifecycle test:**
```
create with prefixed title
GET back, assert fields match what we sent
update one field via partial patch
GET back, assert the patched field changed AND every other field is preserved (proves fetch-then-merge works)
set status to 'trashed'
GET back, assert status === 'trashed'
```

**Manual operator step (one-time, after implementation lands):**
1. Create a Basecamp project named e.g. `MCP Write Test Sandbox`.
2. Add `BASECAMP_TEST_PROJECT_ID=...` to `.env.local`.
3. Run `npm run test:live`.
4. Visually inspect the project in Basecamp's UI to confirm only `[mcp-test-...]` items were created and that they're now in the trash.

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

- All 27 new tools exist, are registered, are dispatched, and pass mock-based unit tests with ≥80% coverage on the new code.
- All 11 wire-up fixes turn previously-broken `Unknown tool` calls into working dispatches with their own mock test coverage.
- `update-merge.ts` has its own focused test file proving fetch→merge→put behaviour and whitelist filtering.
- `npm run test:live` runs end-to-end against a sandbox project and exits 0; a visual inspection of the sandbox project shows only prefixed test artifacts, all trashed.
- `npm test` (mocks-only) passes in CI.
- No existing test regresses.
- No file in `src/` exceeds 800 lines.
- `npm run build` (which runs `tsc`) passes with no type errors.
