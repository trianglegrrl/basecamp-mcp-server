#!/usr/bin/env node

import express from 'express';
import axios from 'axios';
import { config } from 'dotenv';
import { tokenStorage } from '../lib/token-storage.js';
import { projectPath } from '../lib/paths.js';

// Load .env from the project root regardless of cwd.
config({ path: projectPath('.env') });

interface OAuthResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  identity?: {
    accounts: Array<{
      id: number;
      name: string;
      href: string;
    }>;
  };
}

class BasecampOAuthServer {
  private app: express.Application;
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private port = 8000;

  constructor() {
    this.app = express();
    
    this.clientId = process.env.BASECAMP_CLIENT_ID || '';
    this.clientSecret = process.env.BASECAMP_CLIENT_SECRET || '';
    this.redirectUri = process.env.BASECAMP_REDIRECT_URI || 'http://lvh.me:8000/auth/callback';

    if (!this.clientId || !this.clientSecret) {
      console.error('❌ Missing OAuth credentials in .env file');
      console.error('   Please set BASECAMP_CLIENT_ID and BASECAMP_CLIENT_SECRET');
      process.exit(1);
    }

    this.setupRoutes();
  }

  private setupRoutes(): void {
    // Home page with auth link
    this.app.get('/', (req, res) => {
      const authUrl = `https://launchpad.37signals.com/authorization/new?type=web_server&client_id=${this.clientId}&redirect_uri=${encodeURIComponent(this.redirectUri)}`;
      
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Basecamp MCP OAuth Setup</title>
          <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; }
            .button { display: inline-block; background: #1f7a1f; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; }
            .button:hover { background: #155a15; }
            .info { background: #f0f8ff; padding: 20px; border-radius: 6px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <h1>🏕️ Basecamp MCP OAuth Setup</h1>
          
          <div class="info">
            <strong>Ready to connect your Basecamp account!</strong>
            <p>This will authorize the MCP server to access your Basecamp 3 projects and data.</p>
          </div>

          <p>
            <a href="${authUrl}" class="button">🔗 Connect to Basecamp</a>
          </p>

          <h3>What happens next:</h3>
          <ol>
            <li>You'll be redirected to Basecamp's authorization page</li>
            <li>Log in and authorize the application</li>
            <li>You'll be redirected back here with your access token</li>
            <li>The token will be saved securely for MCP server use</li>
          </ol>

          <p><small>Make sure you have created an OAuth application in your Basecamp account at <a href="https://launchpad.37signals.com/integrations">launchpad.37signals.com/integrations</a></small></p>
        </body>
        </html>
      `);
    });

    // OAuth callback
    this.app.get('/auth/callback', async (req, res) => {
      const { code, error } = req.query;

      if (error) {
        res.send(`
          <h1>❌ OAuth Error</h1>
          <p>Error: ${error}</p>
          <p><a href="/">Try again</a></p>
        `);
        return;
      }

      if (!code) {
        res.send(`
          <h1>❌ Missing Authorization Code</h1>
          <p><a href="/">Try again</a></p>
        `);
        return;
      }

      try {
        // Exchange code for access token
        const tokenResponse = await axios.post<OAuthResponse>('https://launchpad.37signals.com/authorization/token', {
          type: 'web_server',
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.redirectUri,
          code,
        });

        const { access_token, refresh_token, expires_in, identity } = tokenResponse.data;

        // Extract account ID from identity
        let accountId = process.env.BASECAMP_ACCOUNT_ID;
        if (!accountId && identity?.accounts?.length) {
          accountId = identity.accounts[0].id.toString();
          console.log(`🔍 Auto-detected account ID: ${accountId}`);
        }

        // Store the token
        await tokenStorage.storeToken(
          access_token,
          refresh_token,
          expires_in,
          accountId
        );

        console.log('✅ OAuth tokens stored successfully');
        
        const accountInfo = identity?.accounts?.length ? `
          <div class="info">
            <strong>Connected Account:</strong><br>
            ${identity.accounts.map(acc => `• ${acc.name} (ID: ${acc.id})`).join('<br>')}
          </div>
        ` : '';

        res.send(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>OAuth Success</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; }
              .success { background: #d4edda; color: #155724; padding: 20px; border-radius: 6px; margin: 20px 0; }
              .info { background: #f0f8ff; padding: 20px; border-radius: 6px; margin: 20px 0; }
              .button { display: inline-block; background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 10px 5px; }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>✅ Success!</h1>
              <p>Your Basecamp account has been connected successfully.</p>
            </div>

            ${accountInfo}

            <h3>📋 Next Steps:</h3>
            <ol>
              <li>Close this browser window</li>
              <li>Stop the OAuth server (Ctrl+C in terminal)</li>
              <li>Generate your MCP configuration:
                <br><code>npm run config:cursor</code> (for Cursor)
                <br><code>npm run config:claude</code> (for Claude Desktop)
              </li>
              <li>Restart your AI assistant</li>
            </ol>

            <p>
              <a href="#" onclick="window.close()" class="button">Close Window</a>
            </p>

            <p><small>Access token expires: ${expires_in ? new Date(Date.now() + expires_in * 1000).toLocaleString() : 'Never'}</small></p>
          </body>
          </html>
        `);

        // Automatically stop server after successful auth
        setTimeout(() => {
          console.log('🔄 OAuth flow complete. Stopping server...');
          process.exit(0);
        }, 2000);

      } catch (error: any) {
        console.error('❌ OAuth token exchange failed:', error.response?.data || error.message);
        
        res.send(`
          <h1>❌ Token Exchange Failed</h1>
          <p>Error: ${error.response?.data?.error || error.message}</p>
          <p><a href="/">Try again</a></p>
        `);
      }
    });
  }

  start(): void {
    this.app.listen(this.port, () => {
      console.log('🚀 Basecamp MCP OAuth Server Started');
      console.log('='.repeat(40));
      console.log(`🌐 Open your browser to: http://lvh.me:${this.port}`);
      console.log('🔗 Complete the OAuth flow to get your access token');
      console.log('');
      console.log('💡 Make sure you have:');
      console.log('   • Created an OAuth app at https://launchpad.37signals.com/integrations');
      console.log('   • Set BASECAMP_CLIENT_ID and BASECAMP_CLIENT_SECRET in .env');
      console.log('   • Set redirect URI to http://lvh.me:8000/auth/callback');
      console.log('');
      console.log('🛑 Press Ctrl+C to stop the server');
    });
  }
}

// Start the server
const oauthServer = new BasecampOAuthServer();
oauthServer.start();
