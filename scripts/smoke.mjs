#!/usr/bin/env node
/**
 * End-to-end smoke test for the Basecamp MCP server.
 *
 * Spawns the compiled server, performs the MCP handshake, calls
 * `get_projects`, and reports whether the credentials reach Basecamp.
 *
 * Usage:
 *   npm run smoke
 *
 * Prerequisites:
 *   - dist/ must be built (`npm run build`)
 *   - Either `oauth_tokens.json` or BASECAMP_ACCESS_TOKEN+BASECAMP_ACCOUNT_ID
 *     must be present
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const serverPath = join(projectRoot, 'dist', 'index.js');

if (!existsSync(serverPath)) {
  console.error(`✗ ${serverPath} not found. Run 'npm run build' first.`);
  process.exit(2);
}

const tokenFile = join(projectRoot, 'oauth_tokens.json');
const hasTokenFile = existsSync(tokenFile);
const hasEnvToken = !!process.env.BASECAMP_ACCESS_TOKEN;

if (!hasTokenFile && !hasEnvToken) {
  console.error('✗ No credentials available.');
  console.error('  Either run `npm run auth` to write oauth_tokens.json,');
  console.error('  or set BASECAMP_ACCESS_TOKEN + BASECAMP_ACCOUNT_ID in the environment.');
  process.exit(2);
}

console.log(`Using credentials from: ${hasEnvToken ? 'env vars (BASECAMP_ACCESS_TOKEN)' : tokenFile}`);
console.log(`Spawning ${serverPath}`);

const child = spawn('node', [serverPath], { stdio: ['pipe', 'pipe', 'pipe'] });

let stdoutBuf = '';
let stderrBuf = '';
child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', (d) => { stdoutBuf += d; });
child.stderr.on('data', (d) => { stderrBuf += d; });

const send = (msg) => child.stdin.write(JSON.stringify(msg) + '\n');

send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'smoke', version: '0' } } });
send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });
send({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} });
send({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'get_projects', arguments: {} } });

setTimeout(() => {
  child.stdin.end();
  setTimeout(() => {
    child.kill();

    const lines = stdoutBuf.split('\n').filter(Boolean);
    const responses = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);

    const initialize = responses.find((r) => r.id === 1);
    const toolsList = responses.find((r) => r.id === 2);
    const toolsCall = responses.find((r) => r.id === 3);

    const passed = [];
    const failed = [];

    if (initialize?.result?.protocolVersion) {
      passed.push(`initialize OK (protocol ${initialize.result.protocolVersion})`);
    } else {
      failed.push(`initialize FAILED: ${JSON.stringify(initialize)}`);
    }

    const toolCount = toolsList?.result?.tools?.length ?? 0;
    if (toolCount > 0) {
      passed.push(`tools/list OK (${toolCount} tools)`);
    } else {
      failed.push(`tools/list FAILED: ${JSON.stringify(toolsList)}`);
    }

    const text = toolsCall?.result?.content?.[0]?.text ?? '';
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = null; }

    if (parsed?.status === 'success' && Array.isArray(parsed.projects)) {
      passed.push(`get_projects OK (${parsed.count} project(s) returned)`);
      console.log('\nFirst 3 projects:');
      parsed.projects.slice(0, 3).forEach((p) => {
        console.log(`  • ${p.name}  [id=${p.id}]`);
      });
    } else if (/Authentication required/.test(text)) {
      failed.push('get_projects FAILED: Authentication required — run `npm run auth` or set BASECAMP_ACCESS_TOKEN');
    } else if (/expired/i.test(text)) {
      failed.push('get_projects FAILED: token expired — re-run `npm run auth`');
    } else if (parsed?.status === 'error') {
      failed.push(`get_projects FAILED: ${parsed.message ?? parsed.error}`);
    } else {
      failed.push(`get_projects FAILED: unrecognized response: ${text || JSON.stringify(toolsCall)}`);
    }

    console.log('\n=== Results ===');
    passed.forEach((m) => console.log(`✓ ${m}`));
    failed.forEach((m) => console.log(`✗ ${m}`));

    if (failed.length > 0) {
      if (stderrBuf.trim()) {
        console.log('\n--- server stderr ---');
        console.log(stderrBuf.trim());
      }
      process.exit(1);
    }

    console.log('\nAll checks passed. The MCP server is wired up correctly.');
    process.exit(0);
  }, 500);
}, 4000);
