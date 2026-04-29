---
name: adding-basecamp-endpoint
description: Use when adding a new MCP tool to this Basecamp 3 server, exposing a missing Basecamp API endpoint, or extending an existing one. Triggers on "this server is missing X", "add a tool for Y", "expose Z via MCP", "find my tasks", "show me <person>'s tasks", "filter by due date", or any new wrapper around `https://3.basecampapi.com`.
---

# Adding a Basecamp 3 API endpoint as an MCP tool

## Overview

This MCP server is a thin wrapper over the Basecamp 3 REST API. Every tool follows the same five-layer recipe:

```
Basecamp 3 API docs (~/projects/bc3-api)
        ↓
src/types/basecamp.ts        ← shape of the response
        ↓
src/lib/basecamp-client.ts   ← one method per endpoint, axios call
        ↓
src/test/basecamp-client.test.ts ← TDD: write the test first
        ↓
src/index.ts                 ← MCP tool def + case handler
```

If you skip TDD or skip the docs cross-check, you will ship a tool that works once and breaks on the second project. Don't.

## When to use

- User asks for a Basecamp capability the server doesn't expose ("there's no tool for `/my/assignments`")
- An existing tool returns an empty/wrong shape and you suspect it's calling the wrong endpoint
- Adding cross-user lookups (someone else's tasks, someone else's calendar)
- Adding new filters (scope-by-due-date, by-bucket, by-status)

**Don't use** for: pure refactors of existing tools, bumping deps, OAuth/install flow changes (that's `install.sh` / `generate-claude-config.ts`).

## The recipe (do not reorder)

### 1. Read the BC3 docs first

The canonical reference is cloned at `~/projects/bc3-api/sections/`. Read the section before writing code. Do not trust your memory of the API.

```bash
ls ~/projects/bc3-api/sections/
cat ~/projects/bc3-api/sections/<topic>.md
```

Pay attention to:
- Exact URL pattern (account-scoped `/people.json` vs project-scoped `/buckets/{id}/...`)
- Required vs optional query params
- Pagination — most list endpoints return a `Link: <...>; rel="next"` header
- Whether the endpoint actually has the filter you assume (e.g. **there is no server-side `assignee` filter on todos**; you must filter client-side)

### 2. Probe the live API before coding

Cheap sanity check that the endpoint exists, returns the shape you expect, and that *your* token can hit it. Run from repo root with the project already built:

```bash
node -e "
import('./dist/lib/token-storage.js').then(async ({tokenStorage}) => {
  const fs = await import('fs');
  const t = await tokenStorage.getToken();
  const env = fs.readFileSync('.env','utf8').split('\n').filter(Boolean).reduce((a,l)=>{const[k,...v]=l.split('=');a[k]=v.join('=').replace(/^\"|\"$/g,'');return a;},{});
  const accountId = t.accountId || env.BASECAMP_ACCOUNT_ID;
  const headers = { Authorization: 'Bearer '+t.accessToken, 'User-Agent': env.USER_AGENT };
  const r = await fetch('https://3.basecampapi.com/'+accountId+'<PATH>', { headers });
  console.log(r.status, r.headers.get('link'));
  console.log((await r.text()).slice(0, 800));
});
"
```

What the probe should tell you:
- HTTP status (403 means the token's user lacks admission to that bucket — see Pitfalls)
- Field names (camelCase vs snake_case — Basecamp uses snake_case)
- Whether `Link` header is set (you must follow it)

### 3. Add the type to `src/types/basecamp.ts`

Keep the shape minimal — only the fields the tool actually returns or filters on. Mark optional fields optional. Don't invent unions; copy the literal types from the JSON probe.

### 4. TDD: write the failing test in `src/test/basecamp-client.test.ts`

Mock `axios` (file already does this). For paginated endpoints, mock `headers.link` and `headers: {}` for the last page. For client-side filters, give a fixture with mixed assignees / due dates and assert the filter result.

For date-scope filters, **always** accept an injected `today` parameter (e.g. `today: '2026-04-29'`). Tests that depend on `new Date()` are flaky.

```typescript
const result = await client.findX({ scope: 'overdue', today: '2026-04-29' });
expect(result.map(t => t.id)).toEqual([1]);
```

Run, watch it FAIL:

```bash
npx vitest run src/test/basecamp-client.test.ts
```

If it passes before you write the impl, the test is wrong.

### 5. Implement in `src/lib/basecamp-client.ts`

Follow existing patterns:
- `this.client.get(path, { params })` — never hand-build query strings
- Always return `response.data`
- Pagination: read `response.headers?.link`, parse `rel="next"`, axios will accept the absolute URL as-is
- Validate enum-ish params at the top of the method and throw before the network call (see `VALID_ASSIGNMENT_SCOPES`)
- Pure helpers (date math, link parsing) go at module top, not on the class

Re-run vitest. RED → GREEN.

### 6. Wire the MCP tool in `src/index.ts`

Two edits in lockstep — they must match by tool `name`:

a. **Tool definition** in the `ListToolsRequestSchema` handler array. Description should describe *when* to use the tool and any non-obvious behavior (client-side filtering, fallback resolution, etc.). InputSchema must match what the case handler reads from `typedArgs`.

b. **Case handler** in the `CallToolRequestSchema` switch. Always wrap output as `{ content: [{ type: 'text', text: JSON.stringify({ status: 'success', ... }, null, 2) }] }`. Include `count` for list responses.

### 7. Build, full test suite, smoke against live API

```bash
npm run build && npm test
```

Then a one-shot live smoke (use the same probe pattern as step 2 but call the new client method via the compiled `dist/`):

```bash
node -e "import('./dist/lib/basecamp-client.js').then(async ({BasecampClient}) => { ... await c.findX(...) ... })"
```

If the smoke works and unit tests pass, the tool is shippable. **Restart Claude Desktop** — it caches the tool list at connect time, so a new tool won't appear until you fully quit and reopen.

## Pitfalls (real ones, hit during development)

| Pitfall | Symptom | Fix |
|---|---|---|
| **Token user ≠ asking user** | "find my tasks" returns empty for the user but they have tasks in the UI | The token's user is whoever ran the OAuth flow. Service-account tokens have their own `/my/*` results. Use the cross-user tool (`get_assignments_for_person`) instead, or re-OAuth as the right user. |
| **`/people.json` is filtered to current-user-visible** | Lookup by name fails for a person you can clearly see in another project | Fall back to scanning `assignees` from `/projects/recordings.json?type=Todo` — the user shows up there even when filtered out of `/people.json`. |
| **Project-scoped 403** | `{"message": "You must first seek admission", "admission_url": "..."}` | The token's user is not a member of that bucket. Don't auto-POST the admission_url; surface the error so the human can decide. |
| **No server-side assignee filter on todos** | Tempting to send `?assignee_id=X` — silently ignored | Walk `/projects/recordings.json?type=Todo` (paginated) and filter client-side. |
| **Forgetting `Link` header pagination** | First-page-only results that look "complete" | Always loop while `parseNextLink(response.headers.link)` returns a URL. |
| **Date scopes that use `new Date()` directly** | Tests pass today, fail tomorrow | Accept `today?: string` (ISO `YYYY-MM-DD`) on filtering methods. Default to `new Date().toISOString().slice(0, 10)` only at the public boundary. |
| **CWD-dependent paths** | Server works from terminal, fails from Claude Desktop | Already fixed (see `src/lib/paths.ts` / `src/index.ts:20`). Don't reintroduce `process.cwd()` for `.env` or `oauth_tokens.json`. |
| **Tool added but invisible in client** | Code shipped, restart didn't help | Claude Desktop / Cursor cache tool lists at connect. Fully quit (Cmd+Q on macOS) and reopen — closing the window is not enough. |

## Quick reference: where each layer lives

| Layer | File | Pattern |
|---|---|---|
| BC3 docs | `~/projects/bc3-api/sections/<topic>.md` | Read first |
| Live probe | inline `node -e` (see step 2) | Use compiled `dist/` |
| Types | `src/types/basecamp.ts` | Minimal, snake_case fields |
| Client method | `src/lib/basecamp-client.ts` | `async fooBar(...): Promise<T>` returning `response.data` |
| Pure helper | `src/lib/basecamp-client.ts` (top of file) | Not a class method |
| Test | `src/test/basecamp-client.test.ts` | Mock `mockAxiosInstance.get`, inject `today` |
| Tool def | `src/index.ts` `ListToolsRequestSchema` array | name, description, inputSchema |
| Case handler | `src/index.ts` `CallToolRequestSchema` switch | `{ status: 'success', ..., count }` |

## Worked example: `get_assignments_for_person`

Real diff that shipped — captures every pattern in this skill in one feature.

1. **Docs:** `~/projects/bc3-api/sections/recordings.md` says `GET /projects/recordings.json` requires `type`, supports `bucket`, `status`, `sort`, `direction`. **No assignee filter.**
2. **Probe:** `Link: <...?page=2&type=Todo>; rel="next"`. Each item has `assignees: [{id, name}]`, `due_on`, `bucket`.
3. **Type:** Reused existing `Todo`-shaped any (recordings return slightly more fields than `/todolists/.../todos.json`; kept return type as `any[]` rather than over-tightening).
4. **Test (RED):** `getRecordingsTodos` follows `Link` across 3 pages; `findAssignmentsForPerson` filters by `personId`, resolves `personName` via `/people.json`, **falls back to recordings' assignees** when `/people.json` misses, and applies date scopes with injected `today`.
5. **Implement:** `parseNextLink` (regex on Link header), `matchesScope` (Mon-start week, disjoint scopes), `getRecordingsTodos` (loop while next), `findAssignmentsForPerson` (resolve → fetch → filter).
6. **Wire:** Tool name `get_assignments_for_person`, accepts `person_id | person_name | scope | bucket`. Case handler echoes the input scope/person back in the response so the model can reason about what it filtered on.
7. **Smoke:** `findAssignmentsForPerson({personName: 'Suzanne'})` → 136 todos, 132 overdue, 1 due later this week. Endpoint confirmed.

## Common rationalizations to ignore

| Excuse | Reality |
|---|---|
| "I remember the BC3 endpoint" | Read the docs anyway. The API has version drift and undocumented constraints. |
| "Just one quick test" | Mocked tests catch type issues; live smoke catches auth/admission/pagination issues. Do both. |
| "Pagination probably isn't needed for this" | The first page always works. Page 2+ is where missing-data bugs hide. |
| "I'll filter client-side later" | "Later" never comes. If the API doesn't support the filter, build the filter into the client method now and unit-test it. |
| "I'll add the type after" | Skipping the type means the next person reading the code can't tell what fields are guaranteed. |
| "The tool description doesn't matter, the model figures it out" | The description is what the model uses to *pick* the tool. Cryptic descriptions = the model never calls your tool. |

## Red flags — STOP and re-check

- Writing client method before reading `~/projects/bc3-api/sections/<topic>.md`
- Test was green on first run (you wrote impl before test)
- Smoke probe returned 403 and you ignored it
- Tool description is a verb-only summary ("Get todos") with no when-to-use signal
- Tool added but you only ran unit tests, no live smoke
