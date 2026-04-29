---
name: using-basecamp-mcp
description: Use when the user wants to query Basecamp 3 through this MCP server — find their own tasks, find someone else's tasks ("show me Jill's tasks due this week"), filter by due-date scope (overdue, today, this week, next week), look up who's on a project, send a Basecamp summary to Slack, or otherwise drive the basecamp-* MCP tools. Triggers on phrases like "my tasks", "[person]'s tasks", "overdue", "due today/this week", "what's on Erin's plate", "L2 project tasks", "send to Slack channel".
---

# Using the Basecamp MCP server

## Overview

This MCP server wraps the Basecamp 3 API. It exposes ~50 tools — most are CRUD on todolists, todos, cards, columns, documents, etc. The tools that come up most often in conversation are the **task-finding** tools added for the L2 / weekly-report workflow.

When the user asks a Basecamp question, your job is to pick the cheapest tool that answers it and avoid walking the whole project tree.

## Quick tool selection

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
| "show me todos in [list]" | `get_todos` |
| Card-table work (kanban) | `get_card_table` → `get_columns` → `get_cards` |

**Never** walk every project's todolists by hand to answer a "who has overdue tasks" question — use the recordings-backed assignment tools (`get_my_*` or `get_assignments_for_person`).

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

## Pitfalls (real ones, not hypothetical)

| Pitfall | Symptom | What to do |
|---|---|---|
| **The token belongs to a service account, not the asking user** | `get_my_assignments` returns `{priorities: [], non_priorities: []}` even though the user clearly has tasks in Basecamp | The "me" in `/my/*` endpoints is whoever ran OAuth, not whoever is talking to Claude. If the user's name doesn't match `get_my_profile`, switch to `get_assignments_for_person` with `person_name=[their name]`. |
| **403 "You must first seek admission"** | `get_project_people` or `get_todolists` returns an admission error for some projects | The token's user isn't a member of that bucket. Tell the user — don't try to auto-join. Offer to retry without that project's bucket filter. |
| **Person not in `get_people` but tasks visible** | `get_assignments_for_person` says "no person matching X" for someone you can clearly see | `/people.json` is filtered to people-visible-to-current-user. The tool already falls back to scanning recording assignees, so try again — if it still misses, the person genuinely has no assigned recordings the token can see. |
| **Cross-user lookups are slow** | `get_assignments_for_person` takes 5–15s | Expected — BC3 has no server-side assignee filter, so the tool walks `/projects/recordings.json?type=Todo` (paginated) and filters client-side. Don't run it in a tight loop; ask once with the right scope. |
| **`due_on` is null** | A todo has no due date and gets dropped from scope filters | Scope filters only match items with a date. If the user asks "all of Jill's open tasks", omit `scope` entirely. |
| **Card steps look like todos** | A "task" in the response has a `parent` that's a card, not a todolist | Some items are kanban card steps surfaced as assignments. They share completion endpoints with todos. Render them with the parent card title for context. |
| **"L2" is ambiguous** | User says "L2 tasks", you guess wrong project | Ask for the URL or call `get_projects` and confirm. The numeric id is in the URL: `https://3.basecamp.com/4418220/projects/45799317` → `45799317`. |

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

## Don't

- Don't call `get_todos` for every todolist in every project to find someone's tasks. Use `get_assignments_for_person`.
- Don't invent project IDs — ask, or list projects first.
- Don't scope a date filter unless the user asked for one. "What does Jill have" ≠ "What's overdue for Jill".
- Don't auto-post to Slack. Confirm channel + content first.
- Don't claim the answer is exhaustive across people you can't see — the token only sees what its user can see.
