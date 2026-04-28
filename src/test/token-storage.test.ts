import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import { TokenStorageManager, tokenStorage } from '../lib/token-storage.js';
import type { OAuthTokens } from '../types/basecamp.js';

// Mock only fs.promises so the path-resolution helpers in src/lib/paths.ts
// (which use the synchronous existsSync) keep working against the real fs.
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof import('fs')>('fs');
  return {
    ...actual,
    promises: {
      readFile: vi.fn(),
      writeFile: vi.fn(),
      chmod: vi.fn(),
      unlink: vi.fn(),
    },
  };
});

const mockFs = vi.mocked(fs);

describe('TokenStorageManager', () => {
  let manager: TokenStorageManager;

  const validToken: OAuthTokens = {
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    accountId: '12345',
    expiresAt: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
    updatedAt: new Date().toISOString()
  };

  const expiredToken: OAuthTokens = {
    accessToken: 'expired-access-token',
    refreshToken: 'expired-refresh-token',
    accountId: '12345',
    expiresAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    updatedAt: new Date().toISOString()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Get a fresh instance for each test
    manager = TokenStorageManager.getInstance();
    // Clear the cache
    (manager as any).tokenCache = null;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = TokenStorageManager.getInstance();
      const instance2 = TokenStorageManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should use the exported singleton instance', () => {
      expect(tokenStorage).toBeInstanceOf(TokenStorageManager);
      expect(tokenStorage).toBe(TokenStorageManager.getInstance());
    });
  });

  describe('Token Reading', () => {
    it('should read tokens from file successfully', async () => {
      const tokenData = { basecamp: validToken };
      mockFs.readFile.mockResolvedValue(JSON.stringify(tokenData));

      const result = await manager.getToken();

      expect(result).toEqual(validToken);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('oauth_tokens.json'),
        'utf-8'
      );
    });

    it('should return null when no tokens exist', async () => {
      mockFs.readFile.mockResolvedValue('{}');

      const result = await manager.getToken();

      expect(result).toBeNull();
    });

    it('should handle file not found gracefully', async () => {
      const error = new Error('File not found') as any;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      const result = await manager.getToken();

      expect(result).toBeNull();
    });

    it('should handle JSON parse errors', async () => {
      mockFs.readFile.mockResolvedValue('invalid json');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await manager.getToken();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Error reading tokens/));
      
      consoleSpy.mockRestore();
    });

    it('should handle other read errors', async () => {
      const error = new Error('Permission denied');
      mockFs.readFile.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await manager.getToken();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Error reading tokens.*Permission denied/));
      
      consoleSpy.mockRestore();
    });

    it('should use cached tokens on subsequent calls', async () => {
      const tokenData = { basecamp: validToken };
      mockFs.readFile.mockResolvedValue(JSON.stringify(tokenData));

      // First call
      const result1 = await manager.getToken();
      // Second call
      const result2 = await manager.getToken();

      expect(result1).toEqual(validToken);
      expect(result2).toEqual(validToken);
      expect(mockFs.readFile).toHaveBeenCalledTimes(1); // Should only read once due to caching
    });
  });

  describe('Token Storage', () => {
    it('should store token successfully with all parameters', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.chmod.mockResolvedValue(undefined);

      const result = await manager.storeToken(
        'new-access-token',
        'new-refresh-token',
        3600,
        '67890'
      );

      expect(result).toBe(true);
      expect(mockFs.writeFile).toHaveBeenCalled();
      expect(mockFs.chmod).toHaveBeenCalledWith(expect.any(String), 0o600);
      
      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      
      expect(writtenData.basecamp).toMatchObject({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        accountId: '67890'
      });
      expect(writtenData.basecamp.expiresAt).toBeDefined();
      expect(writtenData.basecamp.updatedAt).toBeDefined();
    });

    it('should store token with minimal parameters', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.chmod.mockResolvedValue(undefined);

      const result = await manager.storeToken('access-only-token');

      expect(result).toBe(true);
      
      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      
      expect(writtenData.basecamp).toMatchObject({
        accessToken: 'access-only-token',
        accountId: ''
      });
      expect(writtenData.basecamp.refreshToken).toBeUndefined();
      expect(writtenData.basecamp.expiresAt).toBeUndefined();
    });

    it('should preserve existing account ID when not provided', async () => {
      const existingTokens = { basecamp: { ...validToken, accountId: 'existing-account' } };
      mockFs.readFile.mockResolvedValue(JSON.stringify(existingTokens));
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.chmod.mockResolvedValue(undefined);

      await manager.storeToken('new-token');
      
      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      
      expect(writtenData.basecamp.accountId).toBe('existing-account');
    });

    it('should return false for empty access token', async () => {
      const result = await manager.storeToken('');
      
      expect(result).toBe(false);
      expect(mockFs.writeFile).not.toHaveBeenCalled();
    });

    it('should handle write errors', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      const writeError = new Error('Write failed');
      mockFs.writeFile.mockRejectedValue(writeError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(manager.storeToken('test-token')).rejects.toThrow('Write failed');
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Error writing tokens.*Write failed/));
      
      consoleSpy.mockRestore();
    });

    it('should handle chmod errors gracefully', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockResolvedValue(undefined);
      const chmodError = new Error('Chmod failed');
      mockFs.chmod.mockRejectedValue(chmodError);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      await expect(manager.storeToken('test-token')).rejects.toThrow('Chmod failed');
      
      consoleSpy.mockRestore();
    });

    it('should update token cache after successful write', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.chmod.mockResolvedValue(undefined);

      await manager.storeToken('cache-test-token', 'refresh', 3600, 'account123');

      // Second call should use cache, not read file again
      mockFs.readFile.mockClear();
      const result = await manager.getToken();
      
      expect(result?.accessToken).toBe('cache-test-token');
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });
  });

  describe('Token Expiration', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return true for expired token', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({ basecamp: expiredToken }));

      const isExpired = await manager.isTokenExpired();

      expect(isExpired).toBe(true);
    });

    it('should return false for valid token', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({ basecamp: validToken }));

      const isExpired = await manager.isTokenExpired();

      expect(isExpired).toBe(false);
    });

    it('should return true when no token exists', async () => {
      mockFs.readFile.mockResolvedValue('{}');

      const isExpired = await manager.isTokenExpired();

      expect(isExpired).toBe(true);
    });

    it('should treat token without expiration as valid (let API surface 401 if it is not)', async () => {
      const tokenWithoutExpiry = { ...validToken, expiresAt: undefined };
      mockFs.readFile.mockResolvedValue(JSON.stringify({ basecamp: tokenWithoutExpiry }));

      const isExpired = await manager.isTokenExpired();

      expect(isExpired).toBe(false);
    });

    it('should account for 5-minute buffer', async () => {
      // Token expires in 4 minutes
      const soonToExpireToken = {
        ...validToken,
        expiresAt: new Date(Date.now() + 4 * 60 * 1000).toISOString()
      };
      mockFs.readFile.mockResolvedValue(JSON.stringify({ basecamp: soonToExpireToken }));

      const isExpired = await manager.isTokenExpired();

      expect(isExpired).toBe(true); // Should be considered expired due to 5-minute buffer
    });

    it('should handle invalid date formats', async () => {
      const tokenWithInvalidDate = { ...validToken, expiresAt: 'invalid-date' };
      mockFs.readFile.mockResolvedValue(JSON.stringify({ basecamp: tokenWithInvalidDate }));

      const isExpired = await manager.isTokenExpired();

      // JavaScript's Date constructor with 'invalid-date' creates Invalid Date
      // which when compared returns false, so the token appears not expired
      // This is the current behavior - invalid dates are treated as non-expired
      expect(isExpired).toBe(false);
    });
  });

  describe('Token Validation', () => {
    it('should return true for valid token', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({ basecamp: validToken }));

      const hasValidToken = await manager.hasValidToken();

      expect(hasValidToken).toBe(true);
    });

    it('should return false for expired token', async () => {
      mockFs.readFile.mockResolvedValue(JSON.stringify({ basecamp: expiredToken }));

      const hasValidToken = await manager.hasValidToken();

      expect(hasValidToken).toBe(false);
    });

    it('should return false when no token exists', async () => {
      mockFs.readFile.mockResolvedValue('{}');

      const hasValidToken = await manager.hasValidToken();

      expect(hasValidToken).toBe(false);
    });

    it('should return false for token without access token', async () => {
      const tokenWithoutAccess = { ...validToken, accessToken: '' };
      mockFs.readFile.mockResolvedValue(JSON.stringify({ basecamp: tokenWithoutAccess }));

      const hasValidToken = await manager.hasValidToken();

      expect(hasValidToken).toBe(false);
    });

    it('should return false for null access token', async () => {
      const tokenWithNullAccess = { ...validToken, accessToken: undefined as any };
      mockFs.readFile.mockResolvedValue(JSON.stringify({ basecamp: tokenWithNullAccess }));

      const hasValidToken = await manager.hasValidToken();

      expect(hasValidToken).toBe(false);
    });
  });

  describe('Token Clearing', () => {
    it('should clear tokens successfully', async () => {
      mockFs.unlink.mockResolvedValue(undefined);

      const result = await manager.clearTokens();

      expect(result).toBe(true);
      expect(mockFs.unlink).toHaveBeenCalledWith(expect.stringContaining('oauth_tokens.json'));
    });

    it('should handle file not found gracefully', async () => {
      const error = new Error('File not found') as any;
      error.code = 'ENOENT';
      mockFs.unlink.mockRejectedValue(error);

      const result = await manager.clearTokens();

      expect(result).toBe(true); // Should still return true as the goal is achieved
    });

    it('should handle other unlink errors', async () => {
      const error = new Error('Permission denied');
      mockFs.unlink.mockRejectedValue(error);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await manager.clearTokens();

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringMatching(/Error clearing tokens.*Permission denied/));
      
      consoleSpy.mockRestore();
    });

    it('should clear token cache', async () => {
      // Set up cache with existing token
      mockFs.readFile.mockResolvedValue(JSON.stringify({ basecamp: validToken }));
      await manager.getToken(); // This should populate the cache
      
      mockFs.unlink.mockResolvedValue(undefined);
      mockFs.readFile.mockClear();

      await manager.clearTokens();

      // After clearing, the next call should try to read from file again
      mockFs.readFile.mockResolvedValue('{}');
      const result = await manager.getToken();
      
      expect(result).toBeNull();
      expect(mockFs.readFile).toHaveBeenCalled(); // Should read from file, not use cache
    });
  });

  describe('File Permissions', () => {
    it('should set secure file permissions (600) when writing tokens', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.chmod.mockResolvedValue(undefined);

      await manager.storeToken('test-token');

      expect(mockFs.chmod).toHaveBeenCalledWith(
        expect.stringContaining('oauth_tokens.json'),
        0o600
      );
    });
  });

  describe('JSON Handling', () => {
    it('should write formatted JSON with proper indentation', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.chmod.mockResolvedValue(undefined);

      await manager.storeToken('format-test-token');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const jsonString = writeCall[1] as string;
      
      // Should be formatted with 2-space indentation
      expect(jsonString).toContain('  "basecamp"');
      expect(jsonString).toContain('    "accessToken"');
    });

    it('should handle malformed existing JSON gracefully', async () => {
      mockFs.readFile.mockResolvedValue('{ "basecamp": invalid }');
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await manager.getToken();

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('should handle null token data in file', async () => {
      mockFs.readFile.mockResolvedValue('null');

      const result = await manager.getToken();

      expect(result).toBeNull();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined expiration time in storage', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.chmod.mockResolvedValue(undefined);

      await manager.storeToken('no-expiry-token', 'refresh-token', undefined, 'account');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      
      expect(writtenData.basecamp.expiresAt).toBeUndefined();
    });

    it('should handle zero expiration time', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.chmod.mockResolvedValue(undefined);

      await manager.storeToken('zero-expiry-token', 'refresh-token', 0, 'account');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      
      // Zero expiration is falsy, so no expiresAt should be set (same as undefined)
      expect(writtenData.basecamp.expiresAt).toBeUndefined();
    });

    it('should handle very large expiration times', async () => {
      mockFs.readFile.mockResolvedValue('{}');
      mockFs.writeFile.mockResolvedValue(undefined);
      mockFs.chmod.mockResolvedValue(undefined);

      const largeExpirationSeconds = 999999999;
      await manager.storeToken('long-lived-token', 'refresh', largeExpirationSeconds, 'account');

      const writeCall = mockFs.writeFile.mock.calls[0];
      const writtenData = JSON.parse(writeCall[1] as string);
      
      expect(writtenData.basecamp.expiresAt).toBeDefined();
      const expiresAt = new Date(writtenData.basecamp.expiresAt);
      expect(expiresAt.getTime()).toBeGreaterThan(Date.now() + largeExpirationSeconds * 1000 - 1000);
    });

    it('should handle concurrent access gracefully', async () => {
      // Use a fresh manager instance without cache clearing for this test
      const testManager = TokenStorageManager.getInstance();
      mockFs.readFile.mockResolvedValue(JSON.stringify({ basecamp: validToken }));

      // First call to populate the cache
      await testManager.getToken();
      
      // Clear mock call count after initial load
      mockFs.readFile.mockClear();
      
      // Simulate concurrent access - should all use cache
      const promises = Array(5).fill(0).map(() => testManager.getToken());
      const results = await Promise.all(promises);

      // All should return the same result
      results.forEach(result => {
        expect(result).toEqual(validToken);
      });

      // File should not be read again due to caching
      expect(mockFs.readFile).toHaveBeenCalledTimes(0);
    });
  });

  describe('Env-var token fallback', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should return token built from BASECAMP_ACCESS_TOKEN env var', async () => {
      vi.stubEnv('BASECAMP_ACCESS_TOKEN', 'env-access-token');
      vi.stubEnv('BASECAMP_REFRESH_TOKEN', 'env-refresh-token');
      vi.stubEnv('BASECAMP_ACCOUNT_ID', '99999');

      const result = await manager.getToken();

      expect(result?.accessToken).toBe('env-access-token');
      expect(result?.refreshToken).toBe('env-refresh-token');
      expect(result?.accountId).toBe('99999');
      expect(mockFs.readFile).not.toHaveBeenCalled();
    });

    it('should prefer env-var token over file contents when both exist', async () => {
      vi.stubEnv('BASECAMP_ACCESS_TOKEN', 'env-wins');
      mockFs.readFile.mockResolvedValue(JSON.stringify({ basecamp: validToken }));

      const result = await manager.getToken();

      expect(result?.accessToken).toBe('env-wins');
    });

    it('should fall through to file when BASECAMP_ACCESS_TOKEN is unset', async () => {
      vi.stubEnv('BASECAMP_ACCESS_TOKEN', '');
      mockFs.readFile.mockResolvedValue(JSON.stringify({ basecamp: validToken }));

      const result = await manager.getToken();

      expect(result).toEqual(validToken);
    });

    it('should treat env-var token without expiry as not expired', async () => {
      vi.stubEnv('BASECAMP_ACCESS_TOKEN', 'env-access-token');
      // No BASECAMP_TOKEN_EXPIRES_AT set

      const isExpired = await manager.isTokenExpired();

      expect(isExpired).toBe(false);
    });
  });

  describe('Token file path resolution', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('should resolve token file path relative to project root, not cwd', async () => {
      mockFs.readFile.mockResolvedValue('{}');

      await manager.getToken();

      const calledPath = mockFs.readFile.mock.calls[0][0] as string;
      expect(calledPath).toMatch(/oauth_tokens\.json$/);
      // Path must be absolute and not relative to whatever cwd happens to be.
      expect(calledPath.startsWith('/') || /^[A-Z]:/.test(calledPath)).toBe(true);
    });

    it('should honor BASECAMP_TOKEN_FILE env var override', async () => {
      vi.stubEnv('BASECAMP_TOKEN_FILE', '/custom/path/tokens.json');
      mockFs.readFile.mockResolvedValue('{}');

      await manager.getToken();

      expect(mockFs.readFile).toHaveBeenCalledWith('/custom/path/tokens.json', 'utf-8');
    });
  });
});
