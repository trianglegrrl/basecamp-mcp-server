---
name: using-basecamp-mcp
description: Use when the user wants to query or modify Basecamp 3 through this MCP server — find their own tasks, find someone else's tasks ("show me Jill's tasks due this week"), filter by due-date scope (overdue, today, this week, next week), look up who's on a project, send a Basecamp summary to Slack, create or update todos / todolists / messages / comments / schedule entries, trash items, or otherwise drive the basecamp-* MCP tools. Triggers on phrases like "my tasks", "[person]'s tasks", "overdue", "due today/this week", "what's on Erin's plate", "L2 project tasks", "send to Slack channel", "create a todo", "post a message", "trash this".
---

# Using the Basecamp MCP server

## Overview

This MCP server wraps the Basecamp 3 API. It exposes 65 tools — full read + write parity for projects, todo lists, todos, cards, columns, messages, comments, schedule entries, documents, and webhooks. The tools that come up most often are the **task-finding** read tools (added for the L2 / weekly-report workflow) and the **write** tools (create/update/status-change for everyday Basecamp upkeep).

When the user asks a Basecamp question, your job is to pick the cheapest tool that answers it and avoid walking the whole project tree.

## Quick tool selection

### Reading

| User says | Tool to call |
|---|---|
| "my tasks" / "what's on my plate" / "what do I owe" | `get_my_assignments` (active) or `get_my_due_assignments` (filtered by date) |
| "my overdue tasks" / "what's late" | `get_my_due_assignments` with `scope=overdue` |
| "my tasks due today/tomorrow/this week" | `get_my_due_assignments` with the matching `scope` |
| "what have I finished" | `get_my_completed_assignments` |
| "who am I" / "what's my email" | `get_my_profile` |
| **"show me [Name]'s tasks"** (any filter or none) | `get_assignments_for_person` with `person_name` |
| "who is on the L2 project" / "list project members" | `get_project_people` with `project_id` |
| "list everyone in the account" | `get_people` |
| "what projects do we have" | `get_projects` |
| "what's in this project" | `get_project` (returns the dock — todoset id, card_table id, etc.) |
| "show me the to-do lists in [project]" | `get_todolists` |
| "show me a single todo list" | `get_todolist` (project_id + todolist_id) |
| "show me todos in [list]" | `get_todos` |
| "show me a single todo" | `get_todo` (project_id + todo_id) |
| Card-table work (kanban) | `get_card_table` → `get_columns` → `get_cards` → `get_card` |
| "show me the project's message board / list messages" | `get_message_board` → `get_messages` → `get_message` |
| "show me the project's schedule / list events" | `get_schedule` → `get_schedule_entries` → `get_schedule_entry` |
| "show me a single comment" | `get_comment` |
| "list comments on [todo/message/card]" | `get_comments` (recording_id is the parent) |
| "list project documents" / "list uploads" | `get_documents` / `get_uploads` |
| "list / inspect webhooks" | `get_webhooks` |
| "campfire / chat history" | `get_campfire_lines` |
| "daily check-ins" | `get_daily_check_ins` → `get_question_answers` |

**Never** walk every project's todolists by hand to answer a "who has overdue tasks" question — use the recordings-backed assignment tools (`get_my_*` or `get_assignments_for_person`).

### Writing

| User says | Tool to call |
|---|---|
| "create a todo in [list]" | `create_todo` (project_id, todolist_id, content, +optional description/assignee_ids/due_on/starts_on/notify) |
| "rename / re-due / re-assign / re-describe a todo" | `update_todo` (only the fields being changed; rest are preserved — see Write semantics) |
| "mark this todo done" | `complete_todo` |
| "reopen this todo" | `uncomplete_todo` |
| "move this todo to position N" / "into a different list" | `reposition_todo` (with optional `parent_id` for the destination list) |
| "create a new todo list" | `create_todolist` (project_id, todoset_id, name, +optional description) |
| "rename / re-describe a list" | `update_todolist` |
| "post a comment on [todo/message/document/card]" | `create_comment` (project_id, recording_id, content) |
| "edit a comment" | `update_comment` (single-field partial PUT — just `content`) |
| "post a message to [project]" | `get_message_board` → `create_message` (project_id, message_board_id, subject, +optional content/category_id/subscriptions) |
| "edit a message" | `update_message` |
| "schedule an event" | `get_schedule` → `create_schedule_entry` (summary, starts_at, ends_at, +optional description/participant_ids/all_day/notify) |
| "edit a scheduled event" | `update_schedule_entry` |
| "trash / archive / restore a [todo/list/message/comment/event]" | `set_<resource>_status` — one per resource: `set_todo_status`, `set_todolist_status`, `set_message_status`, `set_comment_status`, `set_schedule_entry_status` (status: `'active' \| 'archived' \| 'trashed'`) |
| "create a kanban card" | `create_card` |
| "update / move / complete a card" | `update_card` / `move_card` / `complete_card` |
| "manage card-table columns" | `create_column` / `update_column` / `move_column` / `update_column_color` |
| "add a sub-task to a card" / "edit a step" / "look up a step" | `create_card_step` / `update_card_step` / `get_card_step` / `complete_card_step` |
| "assign someone to a card" | `update_card` with `assignee_ids: [<numeric person id>]` — see Write semantics; create_card itself doesn't accept assignees |
| "assign someone to a card step" | `create_card_step` accepts `assignee_ids` at creation, or `update_card_step` to change later. NUMERIC ids only. |
| "create / update / trash a document" | `create_document` / `update_document` / `trash_document` |
| "create / delete a webhook" | `create_webhook` / `delete_webhook` |

## Date-scope vocabulary

The `scope` param on `get_my_due_assignments` and `get_assignments_for_person` accepts these (and only these):

- `overdue` — `due_on` is before today
- `due_today` — `due_on` is today
- `due_tomorrow` — `due_on` is tomorrow
- `due_later_this_week` — after tomorrow, through Sunday of this week
- `due_next_week` — Mon–Sun of next week
- `due_later` — after next Sunday

Scopes are **disjoint**. "This week" in everyday speech usually maps to `due_today` + `due_tomorrow` + `due_later_this_week` — call once per scope and concatenate, or pick the one the user actually meant.

If the user says "this week" without specifying, ask: "do you want everything from today through Sunday, or just the rest of the week after today?"

## Write semantics

A few invariants that make the write tools predictable and safe.

### Updates are fetch-then-merge

Every `update_*` tool except `update_comment` follows the **full** strategy: it GETs the current resource, overlays your patch onto a whitelist of editable fields, and PUTs the union. So:

```
update_todo({ project_id, todo_id, content: 'new title' })
```

…will **not** clobber `description`, `assignee_ids`, `due_on`, etc. — they survive untouched.

`update_comment` is the exception: it's a single-field partial PUT (just `content`). No GET, no merge.

A `null` in your patch is treated identically to omission ("leave alone"). There is **no way to set a field to null** via these tools — that's intentional, BC3's PUT semantics for these resources don't support it. To clear a description-style field, send `''` (empty string).

### Status changes are idempotent

`set_todo_status`, `set_todolist_status`, `set_message_status`, `set_comment_status`, `set_schedule_entry_status` are safe to call repeatedly with the same status. Trashing a trashed item still returns success. Use them for soft-delete (`'trashed'`), archive (`'archived'`), or restore (`'active'`).

Trash is **recoverable** from the BC3 UI — `'trashed'` is not destruction.

For documents (the one resource type that doesn't go through the recordings-status endpoint): use `trash_document` instead of any `set_*_status` call.

### `create_message` always publishes

`create_message` always sends `status: 'active'` under the hood — no draft-state escape hatch. If the user wants a draft they have to create it in the BC3 UI.

### `create_comment` works on any recording

The `recording_id` arg accepts the id of any "recording" in BC3's sense — todos, messages, documents, cards, schedule entries. To comment on a todo: `create_comment({ project_id, recording_id: <todo_id>, content })`.

### Card assignment is a two-step dance, and IDs must be numeric

Two BC3 quirks combine into one footgun:

1. **`POST /card_tables/lists/{column_id}/cards.json` does not accept `assignee_ids`.** You can only set `title`, `content`, `due_on`, and `notify` at create time. To assign people to a card, **call `create_card` first, then `update_card` with `assignee_ids`**. Card *steps* are the exception — `create_card_step` does accept assignees at create time.

2. **`assignee_ids` must be an array of NUMERIC person IDs**, not strings. BC3 silently drops string IDs — no 422, no error, the assignment just doesn't land. Use the integer ids from `get_people` / `get_project_people` directly:

```js
// ✅ correct
update_card({ project_id, card_id, assignee_ids: [1049715913, 1049715928] })

// 🐛 BC3 silently drops these — assignment fails with no error
update_card({ project_id, card_id, assignee_ids: ['1049715913'] })
```

Todos don't have either quirk — `create_todo` accepts `assignee_ids` at creation, and the API tolerates either string or numeric IDs. The card/step world is stricter.

### Bad args return a structured envelope, not an exception

The dispatch layer validates args with zod before any BC3 call. A schema failure returns:

```json
{
  "status": "error",
  "error": "validation",
  "message": "Invalid arguments for update_card: card_id: Expected string, received number"
}
```

The `error` field is one of: `'validation'`, `'auth.required'`, `'auth.expired'`, `'unknown_tool'`, `'execution'`. Always check `parsed.status === 'success'` before using a tool's payload — the MCP envelope wraps errors as content too, not as protocol-level rejections.

## Common workflows

### "Send my overdue tasks to the L2 Slack channel"

1. `get_my_due_assignments` with `scope=overdue`
2. Optionally filter the response to `bucket.id == [L2 project id]` if "L2" is one specific Basecamp project
3. Format as Slack-ready markdown: `[title] · due [due_on] · [bucket.name]` (one per line)
4. Post via the Slack tool the user has configured. **Do not** guess channel ids — ask if not given.

### "Show me Jill's tasks due this week"

1. `get_assignments_for_person` with `person_name=Jill, scope=due_later_this_week`
2. If 0 results, also try `scope=due_today` and `scope=due_tomorrow` — the user almost certainly meant "rest of this week including today"
3. Render with `bucket.name`, `due_on`, `parent.title` (the todolist name), and `app_url` so the user can click through

### "What's on the L2 project?"

1. `get_projects` to find the project named "L2" (or the user gives the URL — extract the numeric id from the path: `https://3.basecamp.com/[account]/projects/[project_id]`)
2. `get_project` for the dock (lists `todoset`, `card_table`, etc.)
3. From there choose: `get_todolists` for to-do lists, or `get_card_table` → `get_columns` → `get_cards` for kanban

### "Show all overdue tasks across the whole project" (all-member scan)

This is a two-pass hybrid. `get_assignments_for_person` is the primary tool, but its results **must be filtered client-side** and **large responses require special parsing** (see Pitfalls).

**Pass 1 — per-person assignment scan:**

1. `get_project_people` with `project_id` to get all members
2. For each person, call `get_assignments_for_person` with `scope=overdue` and `bucket=[project_id]`
3. For large result sets the MCP stores the response in a file. Parse it correctly (see Pitfalls — "Stored result files have unexpected format")
4. Filter each result set to `completed == false` — the scope filter is **date-only**; it does not exclude completed items
5. Deduplicate by todo `id` (multi-assignee tasks appear in multiple people's results)

**Pass 2 — subgroup verification:**

`get_assignments_for_person` walks the recordings API and surfaces most todos, but tasks in **todolist subgroups** can be missed or truncated for people with large assignment histories. After Pass 1:

6. Call `get_todolists` on the project to discover top-level lists
7. For any list that has a `groups_url`, the MCP has no dedicated `get_groups` tool — instead, collect any subgroup IDs you encountered as `parent.id` values in Pass 1 results
8. Call `get_todos` on each known subgroup ID; filter results to `completed == false` AND `due_on < today`
9. Merge with Pass 1 results, deduplicating by todo `id`

**Note on `get_todos` and parent lists:** `get_todos` called on a **parent todolist** returns empty when all its items live in subgroups. Only call `get_todos` on subgroup IDs (i.e. IDs that appeared as `parent.id` in assignment results), not on the top-level list ID.

### "Create a todo in [project] / [list]"

1. If you don't have the todolist id, `get_todolists` (or `get_project` first if you only have the project URL) to find it
2. `create_todo` with `project_id`, `todolist_id`, `content`, and any optional fields the user mentioned (`description`, `assignee_ids`, `due_on`, `starts_on`, `notify`)
3. The response is the created todo with its server-assigned `id`. If you intend to follow up (set status, edit, comment), record that id

### "Trash these old items"

For todos, todolists, messages, comments, schedule entries: `set_<resource>_status` with `status: 'trashed'`.

For documents: `trash_document` (different endpoint, same effect — moves to trash, recoverable from BC3 UI).

Items in trash are **recoverable from the BC3 UI**. This is soft-delete, not destruction. Permanent deletion has no MCP tool — it's a manual action in BC3.

### "Post a status update to a project's message board"

1. `get_message_board` with `project_id` to find the board's id
2. `create_message` with `project_id`, `message_board_id`, `subject`, and optional `content` (HTML)
3. Optional: `subscriptions: [person_ids]` to notify a specific subset; default is all project members
4. Optional: `category_id` if the board has message types configured

### "Reschedule / rename a calendar event"

1. If you don't have the entry id, `get_schedule` → `get_schedule_entries` to list
2. `update_schedule_entry` with only the fields changing (e.g., `summary`, or new `starts_at` + `ends_at`)
3. Times survive when summary is changed and vice versa — the merge is per-field

### "Comment on a Jill's overdue task to remind her"

1. Get the todo id (from a prior `get_assignments_for_person` call, or `get_todos`)
2. `create_comment` with `project_id`, `recording_id: <todo_id>`, `content: '<div>...HTML body...</div>'`
3. Comments support BC3 rich-text HTML — wrap in `<div>` for paragraph semantics

## Pitfalls (real ones, not hypothetical)

| Pitfall | Symptom | What to do |
|---|---|---|
| **The token belongs to a service account, not the asking user** | `get_my_assignments` returns `{priorities: [], non_priorities: []}` even though the user clearly has tasks in Basecamp | The "me" in `/my/*` endpoints is whoever ran OAuth, not whoever is talking to Claude. If the user's name doesn't match `get_my_profile`, switch to `get_assignments_for_person` with `person_name=[their name]`. |
| **403 "You must first seek admission"** | `get_project_people` or `get_todolists` returns an admission error for some projects | The token's user isn't a member of that bucket. Tell the user — don't try to auto-join. Offer to retry without that project's bucket filter. |
| **Person not in `get_people` but tasks visible** | `get_assignments_for_person` says "no person matching X" for someone you can clearly see | `/people.json` is filtered to people-visible-to-current-user. The tool already falls back to scanning recording assignees, so try again — if it still misses, the person genuinely has no assigned recordings the token can see. |
| **Cross-user lookups are slow** | `get_assignments_for_person` takes 5–15s | Expected — BC3 has no server-side assignee filter, so the tool walks `/projects/recordings.json?type=Todo` (paginated) and filters client-side. Don't run it in a tight loop; ask once with the right scope. |
| **`due_on` is null** | A todo has no due date and gets dropped from scope filters | Scope filters only match items with a date. If the user asks "all of Jill's open tasks", omit `scope` entirely. |
| **Card steps look like todos** | A "task" in the response has a `parent` that's a card, not a todolist | Some items are kanban card steps surfaced as assignments. They share completion endpoints with todos. Render them with the parent card title for context. |
| **Card assignment doesn't stick** | `update_card` (or `create_card_step`) returns success but the people don't appear in the BC3 UI | Two possible causes: (1) you sent `assignee_ids` as strings — BC3 silently drops them, must be numbers; (2) the person isn't a member of the project yet — BC3 won't surface a 422 here, the IDs just don't take. Verify both: `get_people` returns numeric IDs, and the assignee shows up in `get_project_people` for the target project before assigning. |
| **`create_card` rejects `assignee_ids`** | You pass `assignee_ids` to `create_card`; the schema may accept it but BC3 ignores it (the field isn't in the create endpoint) | BC3 quirk — the create endpoint genuinely doesn't take assignees. Two-step it: `create_card` → `update_card` with the IDs. (Card *steps* are the exception — `create_card_step` does accept assignees at create.) |
| **"L2" is ambiguous** | User says "L2 tasks", you guess wrong project | Ask for the URL or call `get_projects` and confirm. The numeric id is in the URL: `https://3.basecamp.com/4418220/projects/45799317` → `45799317`. |
| **`scope=overdue` includes completed items** | All-project scan returns many items, but filtering by `completed == false` in your script yields 0 when there are clearly open tasks | The scope filter is date-only — it does NOT exclude completed todos. Always filter `completed == false` explicitly after receiving results. |
| **Stored result files have unexpected format** | Bash/Python script calls `data.get('assignments')` on a stored file and gets nothing, even though the file is hundreds of KB | When the MCP stores a large result to disk, it wraps the payload: the file is a JSON array `[{"type": "text", "text": "<JSON string>"}]`. Parse with: `outer = json.load(f); data = json.loads(outer[0]['text']); assignments = data['assignments']`. Never call `.get('assignments')` directly on the outer structure. |
| **Subgroup todos missed in all-project scans** | A task clearly visible in the Basecamp UI is absent from `get_assignments_for_person` results | Basecamp todolist **subgroups** are nested Todolist objects. The recordings API surfaces most of them, but people with large assignment histories may have results truncated. Always do Pass 2 (subgroup verification): collect `parent.id` values seen in Pass 1, call `get_todos` on each, and merge. |
| **`get_todos` on a parent list returns empty** | Calling `get_todos` with a top-level todolist ID returns `count: 0` even though the list shows many items in the UI | The list's todos all live in subgroups. `get_todos` on the parent returns nothing. Use the subgroup IDs (found as `parent.id` in assignment results) instead. |
| **`update_*` silently drops `null` patches** | You send `{description: null}` to clear a description; nothing changes | `null` and undefined are both "leave alone". To actually empty a field, send `''` (empty string) — BC3 accepts empty strings for description-style fields. |
| **Validation envelope, not exception** | A bad `update_card` call returns `{status: 'error', error: 'validation', message: '...'}` instead of throwing | The dispatch layer validates with zod before calling BC3. Always check `parsed.status === 'success'` before using a result's payload. The wire shape always succeeds at the MCP protocol layer; errors live inside `content`. |
| **Invalid status enum** | `set_todo_status({status: 'destroyed'})` returns a validation envelope before BC3 is hit | Status enum is exactly `'active' \| 'archived' \| 'trashed'`. Anything else gets rejected at the schema layer. |
| **`create_comment` recording_id mismatch** | You pass a card_table id or a column id; BC3 returns 422 | `recording_id` is the *leaf* — a todo, message, document, card, or schedule entry — not its container. The 422 is BC3's way of saying "that's not a recording I can attach a comment to." |
| **`reposition_todo` parent_id is the destination** | Reposition appears to do nothing, or moves the todo to the wrong list | `parent_id` is the *new* todolist id (omit to reposition within the current list). It is not the current parent. |
| **`create_message` always publishes** | The user wants a draft to review; the message goes live immediately | There is no draft path through the API surface. If the user wants a draft, they need to use the BC3 UI. |
| **HTML in `content` is required for rich text** | A comment posted as plain text shows without paragraph breaks in BC3 | Wrap comment / message / description bodies in `<div>...</div>` (or other BC3-allowed tags). The plain-text-as-HTML path is honored but renders without structure. |

## Output formatting

When the user is going to forward the result (Slack, email, daily standup), default to a compact markdown list:

```
*Overdue (3):*
• Capture FB Group Insights — due 2026-04-20 — Community Engagement → Monthly Tasks
• Update onboarding doc — due 2026-04-25 — L2 → Documentation
• Review PR backlog — due 2026-04-28 — Engineering → Code Review
```

Always include: title (`content`), `due_on`, `bucket.name`, `parent.title`. The `app_url` is what the user clicks to open the item — include it as a link or trailing URL when the destination supports clickable links.

When the user is just reading the answer in chat, prose is fine.

For successful writes, confirm what changed (and the resulting id, if any) — the user usually wants to know the operation landed:

```
✓ Created todo "Review onboarding doc" in L2 → Documentation (id 12345678)
✓ Trashed 3 stale todos in L2 → Old Backlog
```

## Don't

- Don't call `get_todos` for every todolist in every project to find someone's tasks. Use `get_assignments_for_person`.
- Don't invent project IDs — ask, or list projects first.
- Don't scope a date filter unless the user asked for one. "What does Jill have" ≠ "What's overdue for Jill".
- Don't auto-post to Slack. Confirm channel + content first.
- Don't claim the answer is exhaustive across people you can't see — the token only sees what its user can see.
- Don't trust `scope=overdue` to exclude completed tasks — it doesn't. Always filter `completed == false` in your own code.
- Don't parse stored MCP result files as if they're raw Basecamp JSON. Unwrap the `[{"type":"text","text":"..."}]` envelope first.
- Don't call `get_todos` on a top-level todolist ID and assume empty means no tasks — the todos may all be in subgroups.
- Don't pass `null` to `update_*` expecting field-clear behavior — `null` means "leave alone", same as omission. Use `''` to clear, where BC3 accepts it.
- Don't assume `set_*_status({status: 'trashed'})` deletes — it moves to trash, recoverable from the BC3 UI.
- Don't compose multi-step writes (create + update + status) without checking each call's `status` field — a validation failure mid-sequence leaves your state half-applied.
- Don't auto-perform destructive writes (`set_*_status`, `trash_document`, `delete_webhook`) without confirming the user actually meant *these* items. Echo a summary first: "About to trash 5 todos in L2 → Old Backlog — confirm?"
- Don't loop `create_*` calls in a tight burst — BC3 rate-limits writes. If you have N items to create, do them serially with small pauses.
