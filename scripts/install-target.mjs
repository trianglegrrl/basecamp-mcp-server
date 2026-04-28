#!/usr/bin/env node
/**
 * One-shot installer for Claude Desktop / Cursor.
 *
 * Runs the full sequence: npm install → build → OAuth (if needed) → write
 * the AI assistant's MCP config. Idempotent: safe to re-run after pulls,
 * node version changes, or moving the project.
 *
 * Usage (via package.json scripts):
 *   npm run install:claude
 *   npm run install:cursor
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const target = process.argv[2];
if (target !== 'claude' && target !== 'cursor') {
  console.error('Usage: node scripts/install-target.mjs <claude|cursor>');
  process.exit(2);
}

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const tokenFile = join(projectRoot, 'oauth_tokens.json');

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const NC = '\x1b[0m';

function step(n, total, label) {
  console.log(`\n${BOLD}[${n}/${total}] ${label}${NC}`);
}

function run(cmd, args = []) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(cmd, args, { cwd: projectRoot, stdio: 'inherit' });
    child.on('error', rejectRun);
    child.on('exit', (code) => {
      if (code === 0) resolveRun();
      else rejectRun(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

const total = 4;

console.log(`${BOLD}🏕️  Basecamp MCP installer for ${target === 'claude' ? 'Claude Desktop' : 'Cursor IDE'}${NC}`);
console.log(`${DIM}Project: ${projectRoot}${NC}`);

step(1, total, 'Installing npm dependencies');
await run('npm', ['install']);

step(2, total, 'Building TypeScript');
await run('npm', ['run', 'build']);

step(3, total, 'OAuth authentication');
if (existsSync(tokenFile)) {
  console.log(`${DIM}oauth_tokens.json already present, skipping OAuth flow.${NC}`);
  console.log(`${DIM}(Run 'npm run auth' directly if you need to re-authenticate.)${NC}`);
} else {
  console.log('No OAuth tokens found yet. Starting the OAuth flow.');
  console.log('A browser window will open at http://lvh.me:8000 — complete authorization there.');
  await run('npm', ['run', 'auth']);
  if (!existsSync(tokenFile)) {
    console.error('OAuth flow exited but oauth_tokens.json was not written. Aborting.');
    process.exit(1);
  }
}

step(4, total, `Writing ${target} MCP config`);
await run('npm', ['run', `config:${target}`]);

const appName = target === 'claude' ? 'Claude Desktop' : 'Cursor IDE';
console.log(`\n${BOLD}✓ Done.${NC}`);
console.log(`\nFinal manual step: ${BOLD}fully quit ${appName}${NC} (Cmd+Q on macOS — closing the window is not enough) and reopen it.`);
console.log('After reopening, the basecamp tools should appear in the tool list.');
