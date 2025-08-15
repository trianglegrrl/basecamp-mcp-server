import { vi } from 'vitest';
import type { AxiosResponse } from 'axios';
import type { BasecampProject, BasecampTodo, BasecampCardTable, BasecampCard } from '../types/basecamp.js';

/**
 * Test utilities for Vitest testing
 */

export const mockAxiosResponse = <T>(data: T, status = 200): AxiosResponse<T> => ({
  data,
  status,
  statusText: status === 200 ? 'OK' : 'Error',
  headers: {},
  config: {} as any,
});

export const mockBasecampProject = (): BasecampProject => ({
  id: '12345',
  name: 'Test Project',
  description: 'A test project for unit testing',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  url: 'https://3.basecamp.com/12345/projects/67890',
  app_url: 'https://3.basecamp.com/12345/projects/67890',
  bookmarked: false,
  dock: [
    {
      id: '111',
      name: 'todoset',
      enabled: true,
      position: 1,
      url: 'https://3.basecamp.com/12345/buckets/67890/todosets/111',
      app_url: 'https://3.basecamp.com/12345/buckets/67890/todosets/111'
    }
  ]
});

export const mockBasecampTodo = (): BasecampTodo => ({
  id: '54321',
  title: 'Test Todo',
  description: 'A test todo item',
  completed: false,
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  due_on: null,
  assignees: [],
  notes: '',
  url: 'https://3.basecamp.com/12345/buckets/67890/todos/54321',
  app_url: 'https://3.basecamp.com/12345/buckets/67890/todos/54321',
  comments_count: 0,
  parent: {
    id: '111',
    title: 'Test Todolist',
    type: 'Todolist',
    url: 'https://3.basecamp.com/12345/buckets/67890/todosets/111',
    app_url: 'https://3.basecamp.com/12345/buckets/67890/todosets/111'
  }
});

export const mockBasecampCardTable = (): BasecampCardTable => ({
  id: '98765',
  name: 'card_table',
  title: 'Card Table',
  type: 'Kanban::Tray',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  url: 'https://3.basecamp.com/12345/buckets/67890/card_tables/98765',
  app_url: 'https://3.basecamp.com/12345/buckets/67890/card_tables/98765',
  columns: [],
  lists: []
});

export const mockBasecampCard = (): BasecampCard => ({
  id: '13579',
  title: 'Test Card',
  content: 'Test card content',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  url: 'https://3.basecamp.com/12345/buckets/67890/cards/13579',
  app_url: 'https://3.basecamp.com/12345/buckets/67890/cards/13579',
  status: 'active',
  due_on: null,
  assignees: [],
  comments_count: 0,
  steps: [],
  parent: {
    id: '98765',
    title: 'Card Table',
    type: 'Kanban::Tray',
    url: 'https://3.basecamp.com/12345/buckets/67890/card_tables/98765',
    app_url: 'https://3.basecamp.com/12345/buckets/67890/card_tables/98765'
  }
});

export const mockOAuthToken = () => ({
  access_token: 'test_access_token_123',
  token_type: 'Bearer',
  expires_in: 7200,
  refresh_token: 'test_refresh_token_456',
  scope: 'read write',
  created_at: Date.now(),
  account_id: '12345'
});

/**
 * Mock environment variables for testing
 */
export const mockEnvironment = () => {
  vi.stubEnv('BASECAMP_CLIENT_ID', 'test_client_id');
  vi.stubEnv('BASECAMP_CLIENT_SECRET', 'test_client_secret');
  vi.stubEnv('BASECAMP_ACCOUNT_ID', '12345');
  vi.stubEnv('USER_AGENT', 'Test Agent (test@example.com)');
};

/**
 * Create a mock MCP request
 */
export const mockMCPRequest = (method: string, params: any = {}, id: number = 1) => ({
  jsonrpc: '2.0' as const,
  id,
  method,
  params
});

/**
 * Create a mock MCP tool call request
 */
export const mockMCPToolCall = (toolName: string, arguments_: any = {}, id: number = 1) => ({
  jsonrpc: '2.0' as const,
  id,
  method: 'tools/call',
  params: {
    name: toolName,
    arguments: arguments_
  }
});

/**
 * Helper to wait for async operations in tests
 */
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock file system operations
 */
export const mockFileSystem = () => {
  const mockFiles: Record<string, string> = {};
  
  return {
    readFile: vi.fn(async (path: string) => {
      if (mockFiles[path]) {
        return mockFiles[path];
      }
      throw new Error(`File not found: ${path}`);
    }),
    writeFile: vi.fn(async (path: string, data: string) => {
      mockFiles[path] = data;
    }),
    exists: vi.fn(async (path: string) => {
      return mockFiles[path] !== undefined;
    }),
    getFiles: () => mockFiles,
    setFile: (path: string, data: string) => {
      mockFiles[path] = data;
    }
  };
};

/**
 * Mock HTTP server for OAuth testing
 */
export const mockHttpServer = () => {
  const handlers: Record<string, Function> = {};
  
  return {
    listen: vi.fn((port: number, callback?: Function) => {
      if (callback) callback();
      return { port };
    }),
    get: vi.fn((path: string, handler: Function) => {
      handlers[`GET:${path}`] = handler;
    }),
    post: vi.fn((path: string, handler: Function) => {
      handlers[`POST:${path}`] = handler;
    }),
    close: vi.fn((callback?: Function) => {
      if (callback) callback();
    }),
    request: (method: string, path: string, query: any = {}, body: any = {}) => {
      const handler = handlers[`${method.toUpperCase()}:${path}`];
      if (handler) {
        const mockReq = { query, body };
        const mockRes = {
          redirect: vi.fn(),
          send: vi.fn(),
          json: vi.fn(),
          status: vi.fn(() => mockRes)
        };
        handler(mockReq, mockRes);
        return mockRes;
      }
      throw new Error(`No handler for ${method} ${path}`);
    }
  };
};
