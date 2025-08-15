#!/usr/bin/env node

import { spawn } from 'child_process';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the main server file
const serverPath = join(__dirname, '..', 'index.js');

// Handle command line arguments
const args = process.argv.slice(2);

// Check for subcommands
const subcommand = args[0];

function showHelp() {
  console.log(`
🏕️  Basecamp MCP Server

Usage: basecamp-mcp [command] [options]

Commands:
  (no args)     Start the MCP server (for use with AI assistants)
  setup         Set up .env file and OAuth credentials  
  auth          Run OAuth authentication flow
  config        Generate configuration files
    claude      Generate Claude Desktop configuration
    cursor      Generate Cursor IDE configuration
  help          Show this help message

Examples:
  npx @basecamp/mcp-server           # Start server for AI assistants
  npx @basecamp/mcp-server setup     # Set up credentials
  npx @basecamp/mcp-server auth      # Authenticate with Basecamp
  npx @basecamp/mcp-server config claude  # Configure for Claude Desktop

Environment Variables:
  BASECAMP_CLIENT_ID        OAuth application client ID
  BASECAMP_CLIENT_SECRET    OAuth application client secret  
  BASECAMP_ACCOUNT_ID       Your Basecamp account ID
  USER_AGENT               User agent for API requests

For more information, visit: https://github.com/basecamp/mcp-server
`);
}

async function runScript(scriptName: string, scriptArgs: string[] = []) {
  const scriptPath = join(__dirname, '..', 'scripts', `${scriptName}.js`);
  
  return new Promise<void>((resolve, reject) => {
    const child = spawn('node', [scriptPath, ...scriptArgs], {
      stdio: 'inherit',
      cwd: process.cwd(),
      env: process.env
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Script exited with code ${code}`));
      }
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

async function main() {
  try {
    switch (subcommand) {
      case 'help':
      case '--help':
      case '-h':
        showHelp();
        break;

      case 'setup':
        await runScript('setup', args.slice(1));
        break;

      case 'auth':
        await runScript('oauth-app', args.slice(1));
        break;

      case 'config':
        const configType = args[1];
        if (configType === 'claude') {
          await runScript('generate-claude-config', args.slice(2));
        } else if (configType === 'cursor') {
          await runScript('generate-cursor-config', args.slice(2));
        } else {
          console.error('❌ Invalid config type. Use "claude" or "cursor"');
          console.error('   Examples:');
          console.error('     basecamp-mcp config claude');
          console.error('     basecamp-mcp config cursor');
          process.exit(1);
        }
        break;

      case undefined:
        // No subcommand - start the MCP server
        const child = spawn('node', [serverPath], {
          stdio: 'inherit',
          cwd: process.cwd(),
          env: process.env
        });

        child.on('close', (code) => {
          process.exit(code || 0);
        });

        child.on('error', (error) => {
          console.error('Failed to start server:', error);
          process.exit(1);
        });

        // Handle signals
        process.on('SIGINT', () => {
          child.kill('SIGINT');
        });

        process.on('SIGTERM', () => {
          child.kill('SIGTERM');
        });
        break;

      default:
        console.error(`❌ Unknown command: ${subcommand}`);
        console.error('   Run "basecamp-mcp help" for usage information');
        process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
