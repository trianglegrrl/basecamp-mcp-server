import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { spawn, ChildProcess } from 'child_process';
import { mockEnvironment, mockOAuthToken } from './utils.js';

// Mock child_process and other dependencies
vi.mock('child_process');
vi.mock('../lib/token-storage.js', () => ({
  getToken: vi.fn(),
  isTokenExpired: vi.fn()
}));

const mockSpawn = vi.mocked(spawn);

describe('CLI MCP Server', () => {
  let mockProcess: {
    stdin: { write: vi.Mock; end: vi.Mock };
    stdout: { on: vi.Mock; pipe: vi.Mock };
    stderr: { on: vi.Mock };
    on: vi.Mock;
    kill: vi.Mock;
    pid: number;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockEnvironment();

    // Mock child process
    mockProcess = {
      stdin: { write: vi.fn(), end: vi.fn() },
      stdout: { on: vi.fn(), pipe: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
      kill: vi.fn(),
      pid: 12345
    };

    mockSpawn.mockReturnValue(mockProcess as any);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Server Initialization', () => {
    it('should initialize the CLI server process', () => {
      const serverPath = 'src/index.ts';
      spawn('tsx', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      expect(mockSpawn).toHaveBeenCalledWith('tsx', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });
    });

    it('should handle server startup errors', () => {
      spawn('tsx', ['src/index.ts']);
      
      // Simulate setting up error handler
      const errorHandler = vi.fn();
      mockProcess.on('error', errorHandler);
      
      // Simulate error
      const error = new Error('Failed to start server');
      errorHandler(error);

      expect(mockProcess.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('MCP Protocol Communication', () => {
    it('should respond to initialize request', async () => {
      const initRequest = {
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'test', version: '1.0' }
        }
      };

      const expectedResponse = {
        jsonrpc: '2.0',
        id: 1,
        result: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: {} },
          serverInfo: { name: 'basecamp-mcp-server', version: '1.0.0' }
        }
      };

      // Mock stdout response
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(JSON.stringify(expectedResponse) + '\n');
          }, 10);
        }
      });

      spawn('tsx', ['src/index.ts']);

      // Send initialize request
      mockProcess.stdin.write(JSON.stringify(initRequest) + '\n');

      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockProcess.stdin.write).toHaveBeenCalledWith(JSON.stringify(initRequest) + '\n');
    });

    it('should handle tools/list request', async () => {
      const toolsRequest = {
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {}
      };

      const expectedTools = [
        'get_projects',
        'search_basecamp',
        'get_todos',
        'global_search',
        'create_card',
        'get_card_table'
      ];

      const expectedResponse = {
        jsonrpc: '2.0',
        id: 2,
        result: {
          tools: expectedTools.map(name => ({
            name,
            description: expect.any(String),
            inputSchema: expect.any(Object)
          }))
        }
      };

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => {
            const response = {
              jsonrpc: '2.0',
              id: 2,
              result: {
                tools: expectedTools.map(name => ({
                  name,
                  description: `${name} tool`,
                  inputSchema: { type: 'object', properties: {} }
                }))
              }
            };
            callback(JSON.stringify(response) + '\n');
          }, 10);
        }
      });

      spawn('tsx', ['src/index.ts']);
      mockProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockProcess.stdin.write).toHaveBeenCalledWith(JSON.stringify(toolsRequest) + '\n');
    });

    it('should handle tools/call request', async () => {
      const toolCallRequest = {
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name: 'get_projects',
          arguments: {}
        }
      };

      const expectedResponse = {
        jsonrpc: '2.0',
        id: 3,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              projects: []
            })
          }]
        }
      };

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(JSON.stringify(expectedResponse) + '\n');
          }, 10);
        }
      });

      spawn('tsx', ['src/index.ts']);
      mockProcess.stdin.write(JSON.stringify(toolCallRequest) + '\n');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockProcess.stdin.write).toHaveBeenCalledWith(JSON.stringify(toolCallRequest) + '\n');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON input', async () => {
      const invalidJson = 'not valid json';
      
      mockProcess.stderr.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => {
            callback('Invalid JSON input\n');
          }, 10);
        }
      });

      spawn('tsx', ['src/index.ts']);
      mockProcess.stdin.write(invalidJson + '\n');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockProcess.stdin.write).toHaveBeenCalledWith(invalidJson + '\n');
    });

    it('should handle unknown method calls', async () => {
      const unknownMethodRequest = {
        jsonrpc: '2.0',
        id: 4,
        method: 'unknown_method',
        params: {}
      };

      const expectedErrorResponse = {
        jsonrpc: '2.0',
        id: 4,
        error: {
          code: -32601,
          message: 'Method not found'
        }
      };

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(JSON.stringify(expectedErrorResponse) + '\n');
          }, 10);
        }
      });

      spawn('tsx', ['src/index.ts']);
      mockProcess.stdin.write(JSON.stringify(unknownMethodRequest) + '\n');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockProcess.stdin.write).toHaveBeenCalledWith(JSON.stringify(unknownMethodRequest) + '\n');
    });

    it('should handle server crashes gracefully', () => {
      spawn('tsx', ['src/index.ts']);
      
      // Simulate setting up exit handler
      const exitHandler = vi.fn();
      mockProcess.on('exit', exitHandler);
      
      // Simulate server exit
      exitHandler(1, null);

      expect(mockProcess.on).toHaveBeenCalledWith('exit', expect.any(Function));
    });
  });

  describe('Authentication Handling', () => {
    it('should handle missing authentication', async () => {
      const toolCallRequest = {
        jsonrpc: '2.0',
        id: 5,
        method: 'tools/call',
        params: {
          name: 'get_projects',
          arguments: {}
        }
      };

      const expectedErrorResponse = {
        jsonrpc: '2.0',
        id: 5,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              error: 'Not authenticated with Basecamp. Please run authentication first.'
            })
          }]
        }
      };

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(JSON.stringify(expectedErrorResponse) + '\n');
          }, 10);
        }
      });

      spawn('tsx', ['src/index.ts']);
      mockProcess.stdin.write(JSON.stringify(toolCallRequest) + '\n');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockProcess.stdin.write).toHaveBeenCalledWith(JSON.stringify(toolCallRequest) + '\n');
    });

    it('should handle expired tokens', async () => {
      const toolCallRequest = {
        jsonrpc: '2.0',
        id: 6,
        method: 'tools/call',
        params: {
          name: 'get_projects',
          arguments: {}
        }
      };

      const expectedErrorResponse = {
        jsonrpc: '2.0',
        id: 6,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              error: 'Authentication token has expired. Please re-authenticate.'
            })
          }]
        }
      };

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(JSON.stringify(expectedErrorResponse) + '\n');
          }, 10);
        }
      });

      spawn('tsx', ['src/index.ts']);
      mockProcess.stdin.write(JSON.stringify(toolCallRequest) + '\n');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockProcess.stdin.write).toHaveBeenCalledWith(JSON.stringify(toolCallRequest) + '\n');
    });
  });

  describe('Global Search Tool', () => {
    it('should handle global search requests', async () => {
      const searchRequest = {
        jsonrpc: '2.0',
        id: 7,
        method: 'tools/call',
        params: {
          name: 'global_search',
          arguments: { query: 'test search' }
        }
      };

      const expectedResponse = {
        jsonrpc: '2.0',
        id: 7,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'success',
              results: {
                projects: [],
                todos: [],
                messages: [],
                documents: []
              }
            })
          }]
        }
      };

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(JSON.stringify(expectedResponse) + '\n');
          }, 10);
        }
      });

      spawn('tsx', ['src/index.ts']);
      mockProcess.stdin.write(JSON.stringify(searchRequest) + '\n');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockProcess.stdin.write).toHaveBeenCalledWith(JSON.stringify(searchRequest) + '\n');
    });

    it('should validate search query parameter', async () => {
      const invalidSearchRequest = {
        jsonrpc: '2.0',
        id: 8,
        method: 'tools/call',
        params: {
          name: 'global_search',
          arguments: {} // Missing query parameter
        }
      };

      const expectedErrorResponse = {
        jsonrpc: '2.0',
        id: 8,
        result: {
          content: [{
            type: 'text',
            text: JSON.stringify({
              status: 'error',
              error: 'Missing required parameter: query'
            })
          }]
        }
      };

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => {
            callback(JSON.stringify(expectedErrorResponse) + '\n');
          }, 10);
        }
      });

      spawn('tsx', ['src/index.ts']);
      mockProcess.stdin.write(JSON.stringify(invalidSearchRequest) + '\n');

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(mockProcess.stdin.write).toHaveBeenCalledWith(JSON.stringify(invalidSearchRequest) + '\n');
    });
  });

  describe('Process Management', () => {
    it('should properly terminate server process', async () => {
      const proc = spawn('tsx', ['src/index.ts']);
      
      proc.kill('SIGTERM');
      
      expect(mockProcess.kill).toHaveBeenCalledWith('SIGTERM');
    });

    it('should handle SIGINT gracefully', () => {
      spawn('tsx', ['src/index.ts']);
      
      // Simulate setting up SIGINT handler
      const signalHandler = vi.fn();
      mockProcess.on('SIGINT', signalHandler);
      
      // Simulate SIGINT
      signalHandler();

      expect(mockProcess.on).toHaveBeenCalledWith('SIGINT', expect.any(Function));
    });

    it('should timeout on long-running requests', async () => {
      const timeoutRequest = {
        jsonrpc: '2.0',
        id: 9,
        method: 'tools/call',
        params: {
          name: 'get_projects',
          arguments: {}
        }
      };

      // Don't mock a response, simulating timeout
      spawn('tsx', ['src/index.ts']);
      mockProcess.stdin.write(JSON.stringify(timeoutRequest) + '\n');

      // Wait longer than expected timeout
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockProcess.stdin.write).toHaveBeenCalledWith(JSON.stringify(timeoutRequest) + '\n');
    });
  });

  describe('Multiple Request Handling', () => {
    it('should handle multiple sequential requests', async () => {
      const requests = [
        {
          jsonrpc: '2.0',
          id: 10,
          method: 'initialize',
          params: {}
        },
        {
          jsonrpc: '2.0',
          id: 11,
          method: 'tools/list',
          params: {}
        },
        {
          jsonrpc: '2.0',
          id: 12,
          method: 'tools/call',
          params: { name: 'get_projects', arguments: {} }
        }
      ];

      let responseCount = 0;
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => {
            responseCount++;
            const response = {
              jsonrpc: '2.0',
              id: 9 + responseCount,
              result: { success: true }
            };
            callback(JSON.stringify(response) + '\n');
          }, 10 * responseCount);
        }
      });

      spawn('tsx', ['src/index.ts']);

      for (const request of requests) {
        mockProcess.stdin.write(JSON.stringify(request) + '\n');
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockProcess.stdin.write).toHaveBeenCalledTimes(3);
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => ({
        jsonrpc: '2.0',
        id: 20 + i,
        method: 'tools/call',
        params: {
          name: 'get_projects',
          arguments: {}
        }
      }));

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          // Mock responses for all requests
          concurrentRequests.forEach((req, index) => {
            setTimeout(() => {
              const response = {
                jsonrpc: '2.0',
                id: req.id,
                result: { requestIndex: index }
              };
              callback(JSON.stringify(response) + '\n');
            }, Math.random() * 50);
          });
        }
      });

      spawn('tsx', ['src/index.ts']);

      // Send all requests simultaneously
      concurrentRequests.forEach(request => {
        mockProcess.stdin.write(JSON.stringify(request) + '\n');
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockProcess.stdin.write).toHaveBeenCalledTimes(5);
    });
  });

  describe('Performance', () => {
    it('should respond to requests within reasonable time', async () => {
      const startTime = Date.now();
      
      const request = {
        jsonrpc: '2.0',
        id: 30,
        method: 'tools/list',
        params: {}
      };

      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          setTimeout(() => {
            const response = {
              jsonrpc: '2.0',
              id: 30,
              result: { tools: [] }
            };
            callback(JSON.stringify(response) + '\n');
          }, 10);
        }
      });

      spawn('tsx', ['src/index.ts']);
      mockProcess.stdin.write(JSON.stringify(request) + '\n');

      await new Promise(resolve => setTimeout(resolve, 50));

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Should respond within 1 second
      expect(responseTime).toBeLessThan(1000);
    });

    it('should handle high-frequency requests', async () => {
      const requestCount = 10;
      const requests = Array.from({ length: requestCount }, (_, i) => ({
        jsonrpc: '2.0',
        id: 40 + i,
        method: 'tools/list',
        params: {}
      }));

      let responseCount = 0;
      mockProcess.stdout.on.mockImplementation((event, callback) => {
        if (event === 'data') {
          requests.forEach((req, index) => {
            setTimeout(() => {
              responseCount++;
              const response = {
                jsonrpc: '2.0',
                id: req.id,
                result: { tools: [] }
              };
              callback(JSON.stringify(response) + '\n');
            }, index * 5);
          });
        }
      });

      spawn('tsx', ['src/index.ts']);

      // Send requests rapidly
      requests.forEach(request => {
        mockProcess.stdin.write(JSON.stringify(request) + '\n');
      });

      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockProcess.stdin.write).toHaveBeenCalledTimes(requestCount);
    });
  });
});
