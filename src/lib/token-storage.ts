import { promises as fs } from 'fs';
import type { OAuthTokens } from '../types/basecamp.js';
import { projectPath } from './paths.js';

function getTokenFile(): string {
  return process.env.BASECAMP_TOKEN_FILE || projectPath('oauth_tokens.json');
}

function tokenFromEnv(): OAuthTokens | null {
  const accessToken = process.env.BASECAMP_ACCESS_TOKEN;
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: process.env.BASECAMP_REFRESH_TOKEN || undefined,
    accountId: process.env.BASECAMP_ACCOUNT_ID || '',
    expiresAt: process.env.BASECAMP_TOKEN_EXPIRES_AT || undefined,
    updatedAt: new Date().toISOString(),
  };
}

interface TokenStorage {
  basecamp?: OAuthTokens;
}

export class TokenStorageManager {
  private static instance: TokenStorageManager;
  private tokenCache: TokenStorage | null = null;

  static getInstance(): TokenStorageManager {
    if (!TokenStorageManager.instance) {
      TokenStorageManager.instance = new TokenStorageManager();
    }
    return TokenStorageManager.instance;
  }

  private async readTokens(): Promise<TokenStorage> {
    if (this.tokenCache) {
      return this.tokenCache;
    }

    try {
      const data = await fs.readFile(getTokenFile(), 'utf-8');
      this.tokenCache = JSON.parse(data);
      return this.tokenCache || {};
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {};
      }
      console.warn(`Error reading tokens: ${error.message}`);
      return {};
    }
  }

  private async writeTokens(tokens: TokenStorage): Promise<void> {
    try {
      const path = getTokenFile();
      await fs.writeFile(path, JSON.stringify(tokens, null, 2));
      await fs.chmod(path, 0o600);
      this.tokenCache = tokens;
    } catch (error: any) {
      console.error(`Error writing tokens: ${error.message}`);
      throw error;
    }
  }

  async storeToken(
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number,
    accountId?: string
  ): Promise<boolean> {
    if (!accessToken) {
      return false;
    }

    const tokens = await this.readTokens();
    
    const expiresAt = expiresIn 
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : undefined;

    tokens.basecamp = {
      accessToken,
      refreshToken,
      accountId: accountId || tokens.basecamp?.accountId || '',
      expiresAt,
      updatedAt: new Date().toISOString(),
    };

    await this.writeTokens(tokens);
    return true;
  }

  async getToken(): Promise<OAuthTokens | null> {
    const fromEnv = tokenFromEnv();
    if (fromEnv) return fromEnv;
    const tokens = await this.readTokens();
    return tokens.basecamp || null;
  }

  async isTokenExpired(): Promise<boolean> {
    const tokenData = await this.getToken();

    if (!tokenData) {
      return true;
    }
    // Missing expiresAt: assume valid and let the API surface 401 if not.
    // This is required for env-var-supplied tokens which may not include an expiry.
    if (!tokenData.expiresAt) {
      return false;
    }

    try {
      const expiresAt = new Date(tokenData.expiresAt);
      // Add 5-minute buffer to account for clock differences
      const bufferTime = new Date(Date.now() + 5 * 60 * 1000);
      return expiresAt <= bufferTime;
    } catch {
      return true;
    }
  }

  async clearTokens(): Promise<boolean> {
    try {
      await fs.unlink(getTokenFile());
      this.tokenCache = null;
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return true;
      }
      console.error(`Error clearing tokens: ${error.message}`);
      return false;
    }
  }

  async hasValidToken(): Promise<boolean> {
    const token = await this.getToken();
    if (!token?.accessToken) {
      return false;
    }

    const expired = await this.isTokenExpired();
    return !expired;
  }
}

// Singleton instance
export const tokenStorage = TokenStorageManager.getInstance();
