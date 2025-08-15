#!/usr/bin/env node

import { promises as fs } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

const ENV_TEMPLATE = `# Basecamp OAuth Configuration
# Create your OAuth app at: https://launchpad.37signals.com/integrations
BASECAMP_CLIENT_ID=your_client_id_here
BASECAMP_CLIENT_SECRET=your_client_secret_here
BASECAMP_REDIRECT_URI=http://localhost:8000/auth/callback

# Basecamp Account Information
# Find this in your Basecamp 3 URL: https://3.basecamp.com/4389629/projects (the number is your account ID)
BASECAMP_ACCOUNT_ID=your_account_id_here

# User Agent (required by Basecamp API)
USER_AGENT="Your App Name (your@email.com)"

# Application Secrets
FLASK_SECRET_KEY=your_random_secret_key_here
MCP_API_KEY=your_random_api_key_here
`;

function runCommand(command: string, args: string[], cwd?: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`🔄 Running: ${command} ${args.join(' ')}`);
    const child = spawn(command, args, {
      cwd: cwd || process.cwd(),
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        console.error(`❌ Command failed with exit code ${code}`);
        resolve(false);
      }
    });

    child.on('error', (error) => {
      console.error(`❌ Error running command: ${error.message}`);
      resolve(false);
    });
  });
}

async function checkNodeVersion(): Promise<boolean> {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  
  if (major < 18) {
    console.error(`❌ Node.js 18 or higher is required (current: ${version})`);
    console.error('   Please upgrade Node.js and try again.');
    return false;
  }
  
  console.log(`✅ Node.js version: ${version}`);
  return true;
}

async function createEnvFile(): Promise<boolean> {
  const envPath = '.env';
  
  try {
    // Check if .env already exists
    await fs.access(envPath);
    console.log('⚠️  .env file already exists, skipping template creation');
    return true;
  } catch {
    // File doesn't exist, create it
    console.log('📝 Creating .env template...');
    await fs.writeFile(envPath, ENV_TEMPLATE);
    console.log('✅ .env template created');
    return true;
  }
}

async function installDependencies(): Promise<boolean> {
  console.log('📚 Installing dependencies...');
  
  // Check if we're in a directory with package.json
  try {
    await fs.access('package.json');
  } catch {
    console.error('❌ package.json not found. Please run this script from the project root.');
    return false;
  }

  const success = await runCommand('npm', ['install']);
  if (success) {
    console.log('✅ Dependencies installed');
  }
  return success;
}

async function buildProject(): Promise<boolean> {
  console.log('🔨 Building TypeScript project...');
  
  const success = await runCommand('npm', ['run', 'build']);
  if (success) {
    console.log('✅ Project built successfully');
  }
  return success;
}

async function testMCPServer(): Promise<boolean> {
  console.log('🧪 Testing MCP server...');
  
  // Simple test - check if the built server exists
  try {
    await fs.access('./dist/index.js');
    console.log('✅ MCP server build test passed');
    return true;
  } catch {
    console.error('❌ MCP server build not found');
    return false;
  }
}

async function main(): Promise<void> {
  console.log('🚀 Basecamp MCP Server Setup (TypeScript)');
  console.log('='.repeat(40));

  // Check Node.js version
  if (!await checkNodeVersion()) {
    process.exit(1);
  }

  // Install dependencies
  if (!await installDependencies()) {
    process.exit(1);
  }

  // Build project
  if (!await buildProject()) {
    process.exit(1);
  }

  // Create .env template
  if (!await createEnvFile()) {
    process.exit(1);
  }

  // Test MCP server
  if (!await testMCPServer()) {
    process.exit(1);
  }

  console.log('\n' + '='.repeat(40));
  console.log('✅ Setup completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Edit .env file with your Basecamp OAuth credentials');
  console.log('2. Run: npm run auth (to authenticate)');
  console.log('3. Run: npm run config:cursor (to configure Cursor)');
  console.log('   OR: npm run config:claude (to configure Claude Desktop)');
  console.log('4. Restart your AI assistant completely');
  console.log('\n💡 Need OAuth credentials? Create an app at:');
  console.log('   https://launchpad.37signals.com/integrations');
  console.log('\n🚀 Quick start:');
  console.log('   npx @basecamp/mcp-server setup');
  console.log('   npx @basecamp/mcp-server auth');
  console.log('   npx @basecamp/mcp-server config claude');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });
}
