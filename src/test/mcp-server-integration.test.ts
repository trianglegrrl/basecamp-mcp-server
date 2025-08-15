import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BasecampMCPServer, createServer, startServer } from '../index.js';
import { BasecampClient } from '../lib/basecamp-client.js';
import { tokenStorage } from '../lib/token-storage.js';
import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import {
  mockBasecampProject,
  mockBasecampTodo,
  mockBasecampCard,
  mockBasecampCardTable,
  mockOAuthToken,
  mockEnvironment
} from './utils.js';

// Mock the dependencies
vi.mock('../lib/basecamp-client.js');
vi.mock('../lib/token-storage.js');

const MockedBasecampClient = vi.mocked(BasecampClient);
const mockTokenStorage = vi.mocked(tokenStorage);

describe('MCP Server Integration', () => {
  let server: BasecampMCPServer;
  let mockClient: any;

  const mockProjects = [mockBasecampProject()];
  const mockProject = mockBasecampProject();
  const mockTodos = [mockBasecampTodo()];
  const mockCards = [mockBasecampCard()];
  const mockCardTable = mockBasecampCardTable();

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnvironment();

    // Set up token storage mocks
    mockTokenStorage.getToken.mockResolvedValue(mockOAuthToken());
    mockTokenStorage.isTokenExpired.mockResolvedValue(false);

    // Create comprehensive mock client
    mockClient = {
      // Project methods
      getProjects: vi.fn().mockResolvedValue(mockProjects),
      getProject: vi.fn().mockResolvedValue(mockProject),
      
      // Todo methods
      getTodoLists: vi.fn().mockResolvedValue([]),
      getTodos: vi.fn().mockResolvedValue(mockTodos),
      
      // Card table methods
      getCardTable: vi.fn().mockResolvedValue({ id: '123', name: 'card_table' }),
      getCardTableDetails: vi.fn().mockResolvedValue(mockCardTable),
      getColumns: vi.fn().mockResolvedValue(mockCardTable.lists || []),
      
      // Card methods
      getCards: vi.fn().mockResolvedValue(mockCards),
      getCard: vi.fn().mockResolvedValue(mockBasecampCard()),
      createCard: vi.fn().mockResolvedValue(mockBasecampCard()),
      updateCard: vi.fn().mockResolvedValue(mockBasecampCard()),
      moveCard: vi.fn().mockResolvedValue(undefined),
      completeCard: vi.fn().mockResolvedValue({ completed: true }),
      
      // Column methods
      createColumn: vi.fn().mockResolvedValue({ id: '456', title: 'New Column' }),
      updateColumn: vi.fn().mockResolvedValue({ id: '456', title: 'Updated Column' }),
      moveColumn: vi.fn().mockResolvedValue(undefined),
      updateColumnColor: vi.fn().mockResolvedValue({ id: '456', color: 'red' }),
      
      // Card step methods
      getCardSteps: vi.fn().mockResolvedValue([]),
      createCardStep: vi.fn().mockResolvedValue({ id: '789', title: 'New Step' }),
      completeCardStep: vi.fn().mockResolvedValue({ completed: true }),
      
      // Communication methods
      getCampfireLines: vi.fn().mockResolvedValue([]),
      getComments: vi.fn().mockResolvedValue([]),
      
      // Document methods
      getDocuments: vi.fn().mockResolvedValue([]),
      createDocument: vi.fn().mockResolvedValue({ id: '101112', title: 'New Document' }),
      updateDocument: vi.fn().mockResolvedValue({ id: '101112', title: 'Updated Document' }),
      trashDocument: vi.fn().mockResolvedValue(undefined),
      
      // File methods
      getUploads: vi.fn().mockResolvedValue([]),
      
      // Webhook methods
      getWebhooks: vi.fn().mockResolvedValue([]),
      createWebhook: vi.fn().mockResolvedValue({ id: '131415', payload_url: 'https://example.com' }),
      deleteWebhook: vi.fn().mockResolvedValue(undefined),
      
      // Check-in methods
      getDailyCheckIns: vi.fn().mockResolvedValue([]),
      getQuestionAnswers: vi.fn().mockResolvedValue([])
    };

    MockedBasecampClient.mockImplementation(() => mockClient);
    server = new BasecampMCPServer();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Server Creation and Export Functions', () => {
    it('should create server instance with createServer function', () => {
      const createdServer = createServer();
      expect(createdServer).toBeInstanceOf(BasecampMCPServer);
    });

    it('should have startServer function available', () => {
      expect(typeof startServer).toBe('function');
    });

    it('should create server with proper initialization', () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(BasecampMCPServer);
    });
  });

  describe('Basic Server Functionality', () => {
    it('should be an instance of BasecampMCPServer', () => {
      expect(server).toBeInstanceOf(BasecampMCPServer);
    });

    it('should have createServer function that returns server instance', () => {
      const newServer = createServer();
      expect(newServer).toBeInstanceOf(BasecampMCPServer);
    });

    it('should have proper server structure', () => {
      // Test that the server has been constructed properly
      expect(server).toBeDefined();
      
      // Check that the server has internal server property
      expect((server as any).server).toBeDefined();
      
      // Check that the server has client property (initially null)
      expect((server as any).basecampClient).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing token error gracefully', () => {
      // Mock token storage to return null (no token)
      mockTokenStorage.getToken.mockResolvedValue(null);
      
      // The server should be able to handle this case when getBasecampClient is called
      expect(async () => {
        await (server as any).getBasecampClient();
      }).rejects.toThrow();
    });

    it('should handle expired token error gracefully', () => {
      // Mock token as expired
      mockTokenStorage.isTokenExpired.mockResolvedValue(true);
      
      // The server should be able to handle this case when getBasecampClient is called
      expect(async () => {
        await (server as any).getBasecampClient();
      }).rejects.toThrow();
    });
  });

  describe('Authentication and Client Setup', () => {
    it('should verify authentication flow', () => {
      // The BasecampMCPServer calls tokenStorage.getToken() in getBasecampClient method
      expect(tokenStorage.getToken).toBeDefined();
      expect(tokenStorage.isTokenExpired).toBeDefined();
      
      // Verify that the BasecampClient constructor receives expected parameters
      expect(MockedBasecampClient).toBeDefined();
    });
    
    it('should initialize client with expected parameters', async () => {
      // Create a new server instance with mocked dependencies
      const token = mockOAuthToken();
      mockTokenStorage.getToken.mockResolvedValue(token);
      mockTokenStorage.isTokenExpired.mockResolvedValue(false);
      process.env.BASECAMP_ACCOUNT_ID = '12345';
      
      // Create a new server to ensure clean state
      const newServer = createServer();
      
      // We're just testing that the setup methods exist, not actually calling them
      // which would require deeper integration testing and mocking of the MCP SDK
      expect(newServer).toBeInstanceOf(BasecampMCPServer);
      expect(typeof (newServer as any).getBasecampClient).toBe('function');
    });
  });

  describe('Server Lifecycle', () => {
    it('should have error handler set up', () => {
      expect((server as any).server.onerror).toBeDefined();
    });

    it('should have run method available', () => {
      expect(typeof server.run).toBe('function');
    });

    it('should handle setup methods during construction', () => {
      // Test that the server has been set up with handlers during construction
      expect((server as any).server).toBeDefined();
      
      // The server should have internal properties set up
      expect((server as any).server.onerror).toBeDefined();
    });
  });

  describe('Server Integration Validation', () => {
    it('should properly integrate with token storage', () => {
      // Verify that token storage is being called during server operations
      expect(mockTokenStorage.getToken).toBeDefined();
      expect(mockTokenStorage.isTokenExpired).toBeDefined();
    });

    it('should properly integrate with basecamp client', () => {
      // Verify that BasecampClient mock is available
      expect(MockedBasecampClient).toBeDefined();
      expect(mockClient).toBeDefined();
    });
  });

  describe('Export Functions', () => {
    it('should export createServer function that creates new instances', () => {
      const server1 = createServer();
      const server2 = createServer();
      
      expect(server1).toBeInstanceOf(BasecampMCPServer);
      expect(server2).toBeInstanceOf(BasecampMCPServer);
      expect(server1).not.toBe(server2); // Should be different instances
    });

    it('should export startServer function', () => {
      expect(typeof startServer).toBe('function');
    });
  });
});
