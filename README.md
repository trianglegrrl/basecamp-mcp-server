# Basecamp MCP Integration

A modern **TypeScript MCP server** for Basecamp 3, providing seamless integration with Claude Desktop and Cursor IDE through the Model Context Protocol. Built with the official @modelcontextprotocol/sdk and ready for NPX installation.

✅ **TypeScript-First:** Modern, type-safe implementation with full async/await support  
🚀 **NPX Ready:** Install and run with `npx @basecamp/mcp-server`  
⚡ **46 API Tools:** Complete Basecamp 3 integration with all major features

## Quick Setup

### One-line installer (macOS / Linux)

For users who just want it to work, run this in a terminal:

```bash
curl -fsSL https://raw.githubusercontent.com/jhliberty/basecamp-mcp-server/master/install.sh | bash
```

The script will:
- Install Homebrew (macOS only) if missing
- Install `git` and `node` (18+) if missing
- Clone the repo into `./basecamp-mcp-server`
- Install dependencies and build
- Prompt you for your Basecamp OAuth credentials and write `.env`
- Launch the OAuth flow in your browser to finish authentication

You'll need to create an OAuth app first at <https://launchpad.37signals.com/integrations> with redirect URI **`http://lvh.me:8000/auth/callback`**.

### NPX Installation

```bash
# Install and set up in one command
npx jhliberty/basecamp-mcp-server setup

# Authenticate with Basecamp
npx jhliberty/basecamp-mcp-server auth

# Configure for your AI assistant
npx jhliberty/basecamp-mcp-server config claude   # For Claude Desktop
npx jhliberty/basecamp-mcp-server config cursor  # For Cursor IDE
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
   - Available tools: **46 tools** for complete Basecamp control

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
   - You should see "basecamp" listed with all 46 tools available
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

- `get_projects` - Get all Basecamp projects
- `get_project` - Get details for a specific project
- `get_todolists` - Get todo lists for a project
- `get_todos` - Get todos from a todo list
- `search_basecamp` - Search across projects, todos, and messages
- `get_comments` - Get comments for a Basecamp item
- `get_campfire_lines` - Get recent messages from a Basecamp campfire
- `get_daily_check_ins` - Get project's daily check-in questions
- `get_question_answers` - Get answers to daily check-in questions
- `create_attachment` - Upload a file as an attachment
- `get_events` - Get events for a recording
- `get_webhooks` - List webhooks for a project
- `create_webhook` - Create a webhook
- `delete_webhook` - Delete a webhook
- `get_documents` - List documents in a vault
- `get_document` - Get a single document
- `create_document` - Create a document
- `update_document` - Update a document
- `trash_document` - Move a document to trash

### Card Table Tools

- `get_card_table` - Get the card table details for a project
- `get_columns` - Get all columns in a card table
- `get_column` - Get details for a specific column
- `create_column` - Create a new column in a card table
- `update_column` - Update a column title
- `move_column` - Move a column to a new position
- `update_column_color` - Update a column color
- `put_column_on_hold` - Put a column on hold (freeze work)
- `remove_column_hold` - Remove hold from a column (unfreeze work)
- `watch_column` - Subscribe to notifications for changes in a column
- `unwatch_column` - Unsubscribe from notifications for a column
- `get_cards` - Get all cards in a column
- `get_card` - Get details for a specific card
- `create_card` - Create a new card in a column
- `update_card` - Update a card
- `move_card` - Move a card to a new column
- `complete_card` - Mark a card as complete
- `uncomplete_card` - Mark a card as incomplete
- `get_card_steps` - Get all steps (sub-tasks) for a card
- `create_card_step` - Create a new step (sub-task) for a card
- `get_card_step` - Get details for a specific card step
- `update_card_step` - Update a card step
- `delete_card_step` - Delete a card step
- `complete_card_step` - Mark a card step as complete
- `uncomplete_card_step` - Mark a card step as incomplete

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

The project uses the **official @modelcontextprotocol/sdk** for maximum reliability and compatibility:

1. **MCP Server** (`src/index.ts`) - Official MCP SDK with 46 tools, compatible with both Cursor and Claude Desktop
2. **OAuth App** (`src/lib/oauth-app.ts`) - Handles OAuth 2.0 flow with Basecamp  
3. **Token Storage** (`src/lib/token-storage.ts`) - Securely stores OAuth tokens
4. **Basecamp Client** (`src/lib/basecamp-client.ts`) - Basecamp API client library
5. **Type Definitions** (`src/types/basecamp.ts`) - Complete TypeScript interfaces
6. **Configuration Scripts**: 
   - NPM scripts for setup, authentication, and config generation
   - Built-in TypeScript compilation and testing

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

This TypeScript implementation was inspired by and built upon the excellent foundation provided by the original **Python [Basecamp MCP Server](https://github.com/georgeantonopoulos/Basecamp-MCP-Server)**.

**Thank you** to the original Python project maintainers for creating a solid foundation that enabled this TypeScript adaptation! 🙏

## License

This project is licensed under the MIT License.
