import { promises as fs } from 'fs';
import { join } from 'path';
import type { OAuthTokens } from '../types/basecamp.js';

const TOKEN_FILE = join(process.cwd(), 'oauth_tokens.json');

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
      const data = await fs.readFile(TOKEN_FILE, 'utf-8');
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
      await fs.writeFile(TOKEN_FILE, JSON.stringify(tokens, null, 2));
      // Set secure permissions (owner read/write only)
      await fs.chmod(TOKEN_FILE, 0o600);
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
    const tokens = await this.readTokens();
    return tokens.basecamp || null;
  }

  async isTokenExpired(): Promise<boolean> {
    const tokenData = await this.getToken();
    
    if (!tokenData || !tokenData.expiresAt) {
      return true;
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
      await fs.unlink(TOKEN_FILE);
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
