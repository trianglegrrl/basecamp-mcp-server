import { describe, it, expect, beforeAll } from 'vitest';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

/**
 * Boundary tests for the project-root path-resolution change.
 *
 * The bug being guarded against: token-storage and dotenv used to look at
 * `process.cwd()`, which is whatever directory the launcher (Claude Desktop /
 * Cursor / a shell in another folder) happens to be sitting in. A user who
 * completed OAuth in the project dir would still see "Authentication required"
 * the first time their AI assistant tried to use the server.
 *
 * These tests spawn the compiled server from /tmp and assert that:
 *   1. It still finds .env / oauth_tokens.json (no crash, normal auth gate).
 *   2. BASECAMP_ACCESS_TOKEN passed through `env:` reaches the server and
 *      bypasses the file-based token lookup.
 */

const projectRoot = resolve(__dirname, '..', '..');
const serverPath = join(projectRoot, 'dist', 'index.js');

interface RpcResult {
  initializeOk: boolean;
  toolsCallText: string;
  stderr: string;
}

async function probe(env: Record<string, string | undefined>): Promise<RpcResult> {
  return new Promise((resolveResult, rejectResult) => {
    const child = spawn('node', [serverPath], {
      cwd: tmpdir(),
      env: { ...process.env, ...env, BASECAMP_TOKEN_FILE: '/nonexistent/tokens.json' },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdoutBuf = '';
    let stderrBuf = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (d) => { stdoutBuf += d; });
    child.stderr.on('data', (d) => { stderrBuf += d; });
    child.on('error', rejectResult);

    const send = (msg: object) => child.stdin.write(JSON.stringify(msg) + '\n');

    send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test', version: '0' } } });
    send({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} });
    send({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'get_projects', arguments: {} } });

    setTimeout(() => {
      child.stdin.end();
      setTimeout(() => {
        child.kill();
        const lines = stdoutBuf.split('\n').filter(Boolean);
        const responses = lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
        const initialize = responses.find((r: any) => r.id === 1);
        const toolsCall = responses.find((r: any) => r.id === 2);
        const text = toolsCall?.result?.content?.[0]?.text ?? '';
        resolveResult({
          initializeOk: !!initialize?.result?.protocolVersion,
          toolsCallText: text,
          stderr: stderrBuf,
        });
      }, 300);
    }, 1500);
  });
}

describe('Server cwd independence', () => {
  beforeAll(() => {
    if (!existsSync(serverPath)) {
      throw new Error(
        `dist/index.js not found at ${serverPath}. Run 'npm run build' before this test.`
      );
    }
  });

  it('completes the MCP handshake when launched from a different cwd', async () => {
    const result = await probe({});
    expect(result.initializeOk).toBe(true);
  }, 10_000);

  it('uses BASECAMP_ACCESS_TOKEN from spawn env and bypasses the file-based token lookup', async () => {
    const result = await probe({
      BASECAMP_ACCESS_TOKEN: 'spawn-env-token-' + Math.random().toString(36).slice(2),
      BASECAMP_ACCOUNT_ID: '99999',
    });

    // With a token in env we expect the auth gate to pass. The downstream call
    // to Basecamp will fail (fake token), but the failure must not be the
    // "Authentication required" gate — that would prove the env var was ignored.
    expect(result.toolsCallText).not.toMatch(/Authentication required/);
  }, 15_000);

  it('rejects with "Authentication required" when no env-var token and no token file', async () => {
    const result = await probe({ BASECAMP_ACCESS_TOKEN: '' });
    expect(result.toolsCallText).toMatch(/Authentication required/);
  }, 10_000);
});
