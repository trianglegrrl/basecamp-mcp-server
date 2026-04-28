#!/usr/bin/env node

import { promises as fs, existsSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
import { config } from 'dotenv';
import { findProjectRoot, projectPath } from '../lib/paths.js';

// Load .env from the project root regardless of cwd.
config({ path: projectPath('.env') });

function getClaudeDesktopConfigPath(): string {
  switch (platform()) {
    case 'win32':
      return join(homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json');
    case 'darwin':
      return join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');
    default:
      return join(homedir(), '.config', 'claude-desktop', 'claude_desktop_config.json');
  }
}

interface ServerConfig {
  command: string;
  args: string[];
  cwd: string;
  env: Record<string, string>;
}

function buildServerConfig(): ServerConfig {
  const projectRoot = findProjectRoot();
  const entrypoint = join(projectRoot, 'dist', 'index.js');

  if (!existsSync(entrypoint)) {
    throw new Error(
      `dist/index.js not found at ${entrypoint}. Run 'npm run build' before generating the config.`
    );
  }

  const env: Record<string, string> = {};
  if (process.env.BASECAMP_ACCOUNT_ID) {
    env.BASECAMP_ACCOUNT_ID = process.env.BASECAMP_ACCOUNT_ID;
  }

  return {
    command: process.execPath,
    args: [entrypoint],
    cwd: projectRoot,
    env,
  };
}

async function generateConfig(): Promise<boolean> {
  console.log('🚀 Generating Claude Desktop Configuration for Basecamp MCP');
  console.log('='.repeat(60));

  const accountId = process.env.BASECAMP_ACCOUNT_ID;

  if (!accountId) {
    console.error('⚠️  Warning: BASECAMP_ACCOUNT_ID not found in .env file');
    console.error('   Add BASECAMP_ACCOUNT_ID to your .env file for proper configuration');
  }

  const serverConfig = buildServerConfig();

  // Create configuration
  const config = {
    mcpServers: {
      basecamp: serverConfig,
    },
  };

  const configPath = getClaudeDesktopConfigPath();
  const configDir = join(configPath, '..');

  try {
    // Create config directory if it doesn't exist
    await fs.mkdir(configDir, { recursive: true });

    // Load existing config if it exists
    let existingConfig: any = {};
    try {
      const existingData = await fs.readFile(configPath, 'utf-8');
      existingConfig = JSON.parse(existingData);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        console.warn(`⚠️  Warning: Existing config has invalid JSON: ${error.message}`);
      }
    }

    // Merge with existing mcpServers
    if (!existingConfig.mcpServers) {
      existingConfig.mcpServers = {};
    }

    // Add or update Basecamp server
    existingConfig.mcpServers.basecamp = config.mcpServers.basecamp;

    // Write configuration
    await fs.writeFile(configPath, JSON.stringify(existingConfig, null, 2));

    console.log('✅ Claude Desktop configuration updated successfully!');
    console.log(`📍 Config file: ${configPath}`);
    console.log('\n📋 Configuration details:');
    console.log('   • Server name: basecamp');
    console.log(`   • Command:    ${serverConfig.command}`);
    console.log(`   • Args:       ${serverConfig.args.join(' ')}`);
    console.log(`   • Cwd:        ${serverConfig.cwd}`);
    console.log(`   • Account ID: ${accountId || 'YOUR_ACCOUNT_ID_HERE'}`);
    console.log('\n🔄 Next steps:');
    console.log('   1. Restart Claude Desktop completely');
    console.log('   2. Look for the MCP tools icon in Claude Desktop');
    console.log('   3. Enable Basecamp tools in your conversation');
    console.log('\n💡 Troubleshooting:');
    console.log('   • Check Claude Desktop logs for any errors');
    console.log('   • Ensure you have completed OAuth authentication: npm run auth');
    console.log('   • Verify your .env file has correct BASECAMP_ACCOUNT_ID');

    return true;
  } catch (error: any) {
    console.error(`❌ Error writing configuration: ${error.message}`);
    return false;
  }
}

async function main() {
  const success = await generateConfig();
  process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
