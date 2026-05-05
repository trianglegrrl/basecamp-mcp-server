#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { config } from 'dotenv';
import { BasecampClient } from './lib/basecamp-client.js';
import { tokenStorage } from './lib/token-storage.js';
import { projectPath } from './lib/paths.js';
import { tools, dispatch } from './tools/index.js';
import { errorResult } from './tools/result.js';

// Load .env from the project root, not the launching process's cwd.
// This matters because Claude Desktop / Cursor spawn the server from
// their own working directory, which is not where .env lives.
config({ path: projectPath('.env') });

class BasecampMCPServer {
  private server: Server;
  private basecampClient: BasecampClient | null = null;

  constructor() {
    this.server = new Server(
      {
        name: 'basecamp-mcp-server',
        version: '1.0.0',
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Server Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private async getBasecampClient(): Promise<BasecampClient> {
    if (this.basecampClient) {
      return this.basecampClient;
    }

    const tokenData = await tokenStorage.getToken();
    if (!tokenData?.accessToken) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Authentication required. Please run OAuth authentication first: npm run auth'
      );
    }

    const isExpired = await tokenStorage.isTokenExpired();
    if (isExpired) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'OAuth token expired. Please re-authenticate: npm run auth'
      );
    }

    const accountId = tokenData.accountId || process.env.BASECAMP_ACCOUNT_ID;
    const userAgent = process.env.USER_AGENT || 'Basecamp MCP Server (mcp@basecamp-server.dev)';

    if (!accountId) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'Missing BASECAMP_ACCOUNT_ID. Please set it in your .env file.'
      );
    }

    this.basecampClient = new BasecampClient({
      accessToken: tokenData.accessToken,
      accountId,
      userAgent,
      authMode: 'oauth',
    });

    return this.basecampClient;
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return { tools };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      let client: BasecampClient;
      try {
        client = await this.getBasecampClient();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Authentication required';
        return errorResult(message, { error: 'auth.required' });
      }
      return dispatch(
        request.params.name,
        (request.params.arguments ?? {}) as Record<string, unknown>,
        client,
      );
    });
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Basecamp MCP server running on stdio');
  }
}

// Export the server class for testing
export { BasecampMCPServer };

// Create server function for CLI usage
export function createServer(): BasecampMCPServer {
  return new BasecampMCPServer();
}

// Start server function for CLI usage
export async function startServer(): Promise<void> {
  const server = new BasecampMCPServer();
  await server.run();
}

// Start the server if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new BasecampMCPServer();
  server.run().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}
