# Basecamp MCP Integration

A modern **TypeScript MCP server** for Basecamp 3, providing seamless integration with Claude Desktop and Cursor IDE through the Model Context Protocol. Built with the official @modelcontextprotocol/sdk and ready for NPX installation.

✅ **TypeScript-First:** Modern, type-safe implementation with full async/await support  
⚡ **65 API Tools:** Complete Basecamp 3 integration — read + write parity for projects, todos, todo lists, cards, columns, messages, comments, documents, schedule entries, and more

## Quick Setup

### One-line installer (macOS / Linux)

#### Step 1 — Install the prerequisites

The installer needs a few system tools to be present already. It does **not** install them itself, because doing so requires sudo. Install whatever you're missing, then move on to step 2.

**macOS** — install Homebrew if you don't have it:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

The installer will use `brew` to install `git` and `node` for you, so that's all you need on macOS.

**Linux (Debian/Ubuntu)** — install git and Node.js 18+:

```bash
sudo apt-get update && sudo apt-get install -y git
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

**Linux (Fedora)**:

```bash
sudo dnf install -y git
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs
```

**Linux (Arch)**:

```bash
sudo pacman -Sy --noconfirm git nodejs npm
```

#### Step 2 — Create the Basecamp OAuth app

Go to <https://launchpad.37signals.com/integrations>, create an application, and set the redirect URI to:

```
http://lvh.me:8000/auth/callback
```

(This must match exactly. `lvh.me` is a public DNS name that resolves to `127.0.0.1`; we use it because the 37signals form rejects bare `localhost`.)

Keep the Client ID and Client Secret on hand — the installer will ask for them.

#### Step 3 — Run the installer

```bash
curl -fsSL https://raw.githubusercontent.com/trianglegrrl/basecamp-mcp-server/master/install.sh | bash
```

The script will:
- Verify prerequisites are present (errors out with the exact install command if not)
- On macOS, run `brew install git node` if either is missing
- Clone the repo into `./basecamp-mcp-server`
- Install npm dependencies and build
- Prompt you for your Basecamp OAuth credentials and write `.env`
- Launch the OAuth flow in your browser to finish authentication

#### Step 4 — Wire it into Claude Desktop / Cursor

From inside the cloned `basecamp-mcp-server` directory:

```bash
npm run install:claude   # for Claude Desktop
# or
npm run install:cursor   # for Cursor IDE
```

This is a single idempotent command that runs `npm install` → `npm run build` → `npm run auth` (skipped if `oauth_tokens.json` already exists) → writes the assistant's MCP config with absolute paths. Re-run it any time you pull new changes, switch node versions, or move the project — it self-heals.

After it finishes, **fully quit the app (Cmd+Q on macOS — closing the window is not enough)** and reopen it. The basecamp tools should appear in the tool list.

### NPX Installation

```bash
# Install and set up in one command
npx trianglegrrl/basecamp-mcp-server setup

# Authenticate with Basecamp
npx trianglegrrl/basecamp-mcp-server auth

# Configure for your AI assistant
npx trianglegrrl/basecamp-mcp-server config claude   # For Claude Desktop
npx trianglegrrl/basecamp-mcp-server config cursor  # For Cursor IDE
```

### Prerequisites

- **Node.js 18+** (required for ES modules)
- A Basecamp 3 account  
- A Basecamp OAuth application (create one at https://launchpad.37signals.com/integrations)

## Local Development Setup

### For Development

1. **Clone and build the project:**
   ```bash
   git clone <repository-url>
   cd basecamp-mcp-server
   npm install
   npm run build
   ```

2. **Run setup script:**
   ```bash
   npm run setup
   ```

   The setup script automatically:
   - ✅ Installs all TypeScript dependencies
   - ✅ Builds the project to `dist/`
   - ✅ Creates `.env` template file  
   - ✅ Tests MCP server functionality

3. **Configure OAuth credentials:**
   Edit the generated `.env` file:
   ```bash
   BASECAMP_CLIENT_ID=your_client_id_here
   BASECAMP_CLIENT_SECRET=your_client_secret_here
   BASECAMP_ACCOUNT_ID=your_account_id_here
   USER_AGENT="Your App Name (your@email.com)"
   ```

4. **Authenticate with Basecamp:**
   ```bash
   npm run auth
   ```
   Visit http://localhost:8000 and complete the OAuth flow.

5. **Generate configurations:**
   ```bash
   npm run config:cursor  # For Cursor IDE
   npm run config:claude  # For Claude Desktop
   ```

6. **Restart your AI assistant completely** (quit and reopen)

7. **Verify in your AI assistant:**
   - **Cursor**: Go to Settings → MCP, look for "basecamp" with a green checkmark
   - **Claude Desktop**: Look for tools icon (🔍) in chat interface
   - Available tools: **65 tools** for complete Basecamp control

### Test Your Setup

```bash
# Quick test the MCP server
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}
{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node dist/index.js

# Run automated tests  
npm test

# Run tests with UI
npm run test:ui
```

## For Claude Desktop Users

Based on the [official MCP quickstart guide](https://modelcontextprotocol.io/quickstart/server), Claude Desktop integration follows these steps:

### Setup Steps

1. **Complete the basic setup** (steps 1-4 from development setup above):
   ```bash
   git clone <repository-url>
   cd basecamp-mcp-server
   npm install
   npm run setup
   # Configure .env file with OAuth credentials
   npm run auth
   ```

2. **Generate Claude Desktop configuration:**
   ```bash
   npm run config:claude
   ```

3. **Restart Claude Desktop completely** (quit and reopen the application)

4. **Verify in Claude Desktop:**
   - Look for the "Search and tools" icon (🔍) in the chat interface
   - You should see "basecamp" listed with all 65 tools available
   - Toggle the tools on to enable Basecamp integration

### Claude Desktop Configuration

The configuration is automatically created at:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `~/AppData/Roaming/Claude/claude_desktop_config.json`  
- **Linux**: `~/.config/claude-desktop/claude_desktop_config.json`

Example configuration generated:
```json
{
  "mcpServers": {
    "basecamp": {
      "command": "node",
      "args": ["/path/to/your/project/dist/index.js"],
      "env": {
        "BASECAMP_ACCOUNT_ID": "your_account_id"
      }
    }
  }
}
```

### Usage in Claude Desktop

Ask Claude things like:
- "What are my current Basecamp projects?"
- "Show me the latest campfire messages from the Technology project"
- "Create a new card in the Development column with title 'Fix login bug'"
- "Get all todo items from the Marketing project"
- "Search for messages containing 'deadline'"

### Troubleshooting Claude Desktop

**Check Claude Desktop logs** (following [official debugging guide](https://modelcontextprotocol.io/quickstart/server#troubleshooting)):
```bash
# macOS/Linux - Monitor logs in real-time
tail -n 20 -f ~/Library/Logs/Claude/mcp*.log

# Check for specific errors
ls ~/Library/Logs/Claude/mcp-server-basecamp.log
```

**Common issues:**
- **Tools not appearing**: Verify configuration file syntax and restart Claude Desktop
- **Connection failures**: Check that Node.js path and script path are absolute paths
- **Authentication errors**: Ensure OAuth flow completed successfully (`oauth_tokens.json` exists)

## Available MCP Tools

Once configured, you can use these tools in Cursor:

### Read & Account Tools

- `get_projects` - Get all Basecamp projects
- `get_project` - Get details for a specific project
- `get_my_profile` - Current user profile (id / name / email)
- `get_my_assignments` - Active todos and card steps assigned to me
- `get_my_due_assignments` - Filtered by due-date scope (overdue, today, this week, …)
- `get_my_completed_assignments` - Recently completed assignments
- `get_people` - All people visible to the current user
- `get_project_people` - Active people on a given project
- `get_assignments_for_person` - Find todos assigned to ANY named person (e.g., "Jill's tasks due this week")
- `get_campfire_lines` - Get recent messages from a Basecamp campfire
- `get_daily_check_ins` - Get project's daily check-in questions
- `get_question_answers` - Get answers to daily check-in questions
- `get_events` - Get events for a recording

### Todo Tools

- `get_todolists` - Get todo lists for a project
- `get_todolist` - Get a single todo list by ID
- `create_todolist` - Create a new todo list under a project's todo set
- `update_todolist` - Update name or description (fetch-then-merge)
- `set_todolist_status` - Active / archived / trashed (idempotent)
- `get_todos` - Get todos from a todo list
- `get_todo` - Get a single todo by ID
- `create_todo` - Create a new todo (content, description, assignees, due_on, …)
- `update_todo` - Update fields on an existing todo (fetch-then-merge)
- `complete_todo` / `uncomplete_todo` - Toggle completion
- `reposition_todo` - Move a todo to a new position; optionally to a different todo list
- `set_todo_status` - Active / archived / trashed (idempotent)

### Message & Comment Tools

- `get_message_board` - Get the message board for a project
- `get_messages` - List messages on a message board
- `get_message` - Get a single message
- `create_message` - Post a new message (always published immediately)
- `update_message` - Update fields (fetch-then-merge)
- `set_message_status` - Active / archived / trashed
- `get_comments` - Get comments for any Basecamp recording
- `get_comment` - Get a single comment by ID
- `create_comment` - Post a comment on a recording (todo, message, document, card, …)
- `update_comment` - Update a comment's content (partial PUT)
- `set_comment_status` - Active / archived / trashed

### Schedule Tools

- `get_schedule` - Get the schedule for a project
- `get_schedule_entries` - List entries on a schedule
- `get_schedule_entry` - Get a single schedule entry
- `create_schedule_entry` - Create a new entry (summary, starts_at, ends_at, participants, all_day, notify)
- `update_schedule_entry` - Update fields (fetch-then-merge)
- `set_schedule_entry_status` - Active / archived / trashed

### Document & File Tools

- `get_documents` - List documents in a vault
- `create_document` - Create a document
- `update_document` - Update a document
- `trash_document` - Move a document to trash
- `get_uploads` - List uploads in a project or vault

### Webhook Tools

- `get_webhooks` - List webhooks for a project
- `create_webhook` - Create a webhook
- `delete_webhook` - Delete a webhook

### Card Table Tools

- `get_card_table` - Get the card table details for a project
- `get_columns` - Get all columns in a card table
- `create_column` - Create a new column in a card table
- `update_column` - Update a column title
- `move_column` - Move a column to a new position
- `update_column_color` - Update a column color
- `get_cards` - Get all cards in a column
- `get_card` - Get details for a specific card
- `create_card` - Create a new card in a column
- `update_card` - Update a card
- `move_card` - Move a card to a new column
- `complete_card` - Mark a card as complete
- `get_card_steps` - Get all steps (sub-tasks) for a card
- `create_card_step` - Create a new step (sub-task) for a card
- `complete_card_step` - Mark a card step as complete

### Example Cursor Usage

Ask Cursor things like:
- "Show me all my Basecamp projects"
- "What todos are in project X?"
- "Search for messages containing 'deadline'"
- "Get details for the Technology project"
- "Show me the card table for project X"
- "Create a new card in the 'In Progress' column"
- "Move this card to the 'Done' column"
- "Update the color of the 'Urgent' column to red"
- "Mark card as complete"
- "Show me all steps for this card"
- "Create a sub-task for this card"
- "Mark this card step as complete"

## Architecture

The project uses the **official @modelcontextprotocol/sdk** and is organized into three layers so each piece can be tested in isolation:

1. **MCP server bootstrap** (`src/index.ts`) - Thin shell (~140 lines): wires the SDK, owns the auth gate, delegates every `tools/call` to the dispatch layer.
2. **Tool layer** (`src/tools/`) - One handler module per resource group under `src/tools/handlers/*.ts` (cards, columns, todos, todolists, comments, messages, schedule, recording-status, documents, webhooks, misc), a flat tool array in `registrations.ts`, and a lookup-based dispatcher in `dispatch.ts`.
3. **Resource / HTTP client layer** (`src/lib/`) - Per-resource modules (`src/lib/resources/*.ts`) export plain functions that take an `AxiosInstance`; `BasecampClient` is a thin facade. Shared helpers: `pagination.ts` (paginated link-walking), `update-merge.ts` (full vs partial PUT strategies), `resources/dock.ts` (project dock-entry lookup).
4. **OAuth + storage** (`src/scripts/oauth-app.ts`, `src/lib/token-storage.ts`, `src/lib/paths.ts`) - Browser OAuth flow + on-disk token persistence + project-root resolution that's independent of where the binary was launched from.
5. **Type definitions** (`src/types/basecamp.ts`) - Complete TypeScript interfaces for every resource type and PUT/POST wire body.
6. **Tests** - `vitest.config.ts` runs the mock suite (CI-safe, ~370 tests). `vitest.live.config.ts` runs sandbox lifecycle tests against a real Basecamp project (operator-only); see Live tests below.

### Live tests (operator-only)

A separate suite under `src/test/live/` exercises full create → get → update → trash lifecycles against a real Basecamp project. It is **gated by two safety layers**:

- `BASECAMP_TEST_PROJECT_ID` must be set in the environment.
- The project's name must contain the literal `MCP_TEST_SANDBOX` (overrideable via `BASECAMP_TEST_PROJECT_NAME_GUARD`).

If either guard fails, the suite refuses to start — no Basecamp API call is made.

```bash
# Run end-to-end against your sandbox project
BASECAMP_TEST_PROJECT_ID=<sandbox-id> npm run test:live

# Crash-recovery: trash any IDs left behind by an interrupted run
npm run test:live:cleanup
```

Each created record is appended to a per-run `.test-live-ids-{runId}.json` in the project root before any further test step; the run normally trashes its own records and deletes that file. If anything leaks, the file is preserved so the cleanup script can pick up the orphans.

## Troubleshooting

### Common Issues (Both Clients)

- 🔴 **Red/Yellow indicator:** Run `npm run setup` to build the project and dependencies
- 🔴 **"0 tools available":** Project not built or dependencies missing - run setup script
- 🔴 **"Tool not found" errors:** Restart your client (Cursor/Claude Desktop) completely
- ⚠️ **Missing BASECAMP_ACCOUNT_ID:** Add to `.env` file, then re-run the config generator

### Quick Fixes

**Problem: Server won't start**
```bash
# Test if MCP server works:
node dist/index.js
# If this fails, run: npm run build
```

**Problem: Wrong Node.js version**
```bash
node --version  # Must be 18+
# If too old, install newer Node.js and re-run setup
```

**Problem: Authentication fails**
```bash  
# Check OAuth flow:
npm run auth
# Visit http://localhost:8000 and complete login
```

### Manual Configuration (Last Resort)

**Cursor config location:** `~/.cursor/mcp.json` (macOS/Linux) or `%APPDATA%\Cursor\mcp.json` (Windows)  
**Claude Desktop config location:** `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
    "mcpServers": {
        "basecamp": {
            "command": "node",
            "args": ["/full/path/to/your/project/dist/index.js"],
            "cwd": "/full/path/to/your/project",
            "env": {
                "BASECAMP_ACCOUNT_ID": "your_account_id"
            }
        }
    }
}
```

## Finding Your Account ID

If you don't know your Basecamp account ID:
1. Log into Basecamp in your browser
2. Look at the URL - it will be like `https://3.basecamp.com/4389629/projects`
3. The number (4389629 in this example) is your account ID

## Security Notes

- Keep your `.env` file secure and never commit it to version control
- The OAuth tokens are stored locally in `oauth_tokens.json`
- This setup is designed for local development use

## Acknowledgments

This repository is a fork of **[jhliberty/basecamp-mcp-server](https://github.com/jhliberty/basecamp-mcp-server)** — the original TypeScript port of the Basecamp MCP server. That project, in turn, was inspired by the **Python [Basecamp MCP Server](https://github.com/georgeantonopoulos/Basecamp-MCP-Server)** by George Antonopoulos.

**Thank you** to John Henry Liberty for the TypeScript port that this fork builds on, and to the original Python project maintainers for the foundation it all rests on. 🙏

This fork (**[trianglegrrl/basecamp-mcp-server](https://github.com/trianglegrrl/basecamp-mcp-server)**) extends jhliberty's work with full write parity (todos, todolists, comments, messages, schedule entries), per-resource handler refactor, and a sandbox-gated live-test suite.

## License

This project is licensed under the MIT License.
