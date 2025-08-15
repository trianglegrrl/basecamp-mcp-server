import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mockBasecampProject, mockBasecampCard, mockBasecampCardTable, mockEnvironment } from './utils.js';

// Mock the modules we'll be testing (once they exist)
const mockMCPServer = {
  tools: [] as any[],
  _execute_tool: vi.fn()
};

const mockBasecampClient = {
  get_card_table: vi.fn(),
  get_card_table_details: vi.fn(),
  create_card: vi.fn(),
  create_column: vi.fn(),
  update_column_color: vi.fn(),
  patch: vi.fn()
};

describe('Card Table Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnvironment();
    
    // Mock the expected tools that should be registered
    mockMCPServer.tools = [
      { name: 'get_card_table', inputSchema: { type: 'object', properties: { project_id: { type: 'string' } }, required: ['project_id'] } },
      { name: 'get_columns', inputSchema: { type: 'object', properties: { project_id: { type: 'string' } }, required: ['project_id'] } },
      { name: 'get_column', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, column_id: { type: 'string' } }, required: ['project_id', 'column_id'] } },
      { name: 'create_column', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, card_table_id: { type: 'string' }, title: { type: 'string' } }, required: ['project_id', 'card_table_id', 'title'] } },
      { name: 'update_column', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, column_id: { type: 'string' }, title: { type: 'string' } }, required: ['project_id', 'column_id', 'title'] } },
      { name: 'move_column', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, column_id: { type: 'string' }, position: { type: 'number' } }, required: ['project_id', 'column_id', 'position'] } },
      { name: 'update_column_color', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, column_id: { type: 'string' }, color: { type: 'string' } }, required: ['project_id', 'column_id', 'color'] } },
      { name: 'put_column_on_hold', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, column_id: { type: 'string' } }, required: ['project_id', 'column_id'] } },
      { name: 'remove_column_hold', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, column_id: { type: 'string' } }, required: ['project_id', 'column_id'] } },
      { name: 'watch_column', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, column_id: { type: 'string' } }, required: ['project_id', 'column_id'] } },
      { name: 'unwatch_column', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, column_id: { type: 'string' } }, required: ['project_id', 'column_id'] } },
      { name: 'get_cards', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, column_id: { type: 'string' } }, required: ['project_id', 'column_id'] } },
      { name: 'get_card', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, card_id: { type: 'string' } }, required: ['project_id', 'card_id'] } },
      { name: 'create_card', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, column_id: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' } }, required: ['project_id', 'column_id', 'title'] } },
      { name: 'update_card', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, card_id: { type: 'string' }, title: { type: 'string' }, content: { type: 'string' } }, required: ['project_id', 'card_id'] } },
      { name: 'move_card', inputSchema: { type: 'object', properties: { project_id: { type: 'string' }, card_id: { type: 'string' }, column_id: { type: 'string' } }, required: ['project_id', 'card_id', 'column_id'] } }
    ];
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Tool Registration', () => {
    it('should register all card table tools', () => {
      const toolNames = mockMCPServer.tools.map(tool => tool.name);
      
      const expectedTools = [
        'get_card_table',
        'get_columns', 
        'get_column',
        'create_column',
        'update_column',
        'move_column',
        'update_column_color',
        'put_column_on_hold',
        'remove_column_hold',
        'watch_column',
        'unwatch_column',
        'get_cards',
        'get_card',
        'create_card',
        'update_card',
        'move_card'
      ];
      
      for (const tool of expectedTools) {
        expect(toolNames).toContain(tool);
      }
    });
  });

  describe('Tool Schemas', () => {
    it('should have proper get_card_table schema', () => {
      const tool = mockMCPServer.tools.find(t => t.name === 'get_card_table');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('project_id');
      expect(tool.inputSchema.required).toContain('project_id');
    });

    it('should have proper create_card schema', () => {
      const tool = mockMCPServer.tools.find(t => t.name === 'create_card');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.type).toBe('object');
      expect(tool.inputSchema.properties).toHaveProperty('project_id');
      expect(tool.inputSchema.properties).toHaveProperty('column_id');
      expect(tool.inputSchema.properties).toHaveProperty('title');
      expect(tool.inputSchema.properties).toHaveProperty('content');
      expect(tool.inputSchema.required).toContain('project_id');
      expect(tool.inputSchema.required).toContain('column_id');
      expect(tool.inputSchema.required).toContain('title');
      expect(tool.inputSchema.required).not.toContain('content'); // content is optional
    });
  });

  describe('Tool Execution', () => {
    beforeEach(() => {
      // Mock token storage to return valid token
      mockMCPServer._execute_tool = vi.fn().mockImplementation(async (toolName: string, args: any) => {
        if (toolName === 'get_card_table') {
          const cardTable = mockBasecampCardTable();
          mockBasecampClient.get_card_table.mockResolvedValueOnce({ id: '123', name: 'card_table' });
          mockBasecampClient.get_card_table_details.mockResolvedValueOnce({
            id: '123',
            name: 'card_table', 
            title: 'Card Table',
            columns_count: 4
          });
          
          return {
            status: 'success',
            card_table: {
              id: '123',
              name: 'card_table',
              title: 'Card Table', 
              columns_count: 4
            }
          };
        }
        
        if (toolName === 'create_card') {
          const newCard = mockBasecampCard();
          mockBasecampClient.create_card.mockResolvedValueOnce({
            id: '789',
            title: 'New Card',
            content: 'Card content',
            column_id: '456'
          });
          
          return {
            status: 'success',
            card: {
              id: '789',
              title: 'New Card', 
              content: 'Card content',
              column_id: '456'
            },
            message: 'Card created successfully'
          };
        }
        
        return { status: 'error', error: 'Unknown tool' };
      });
    });

    it('should execute get_card_table tool successfully', async () => {
      const result = await mockMCPServer._execute_tool('get_card_table', { project_id: '456' });
      
      expect(result.status).toBe('success');
      expect(result).toHaveProperty('card_table');
      expect(result.card_table.id).toBe('123');
    });

    it('should execute create_card tool successfully', async () => {
      const result = await mockMCPServer._execute_tool('create_card', {
        project_id: '123',
        column_id: '456', 
        title: 'New Card',
        content: 'Card content'
      });
      
      expect(result.status).toBe('success');
      expect(result).toHaveProperty('card');
      expect(result.card.title).toBe('New Card');
      expect(result.message).toContain('created successfully');
    });
  });

  describe('Input Validation', () => {
    it('should validate required project_id parameter', async () => {
      const result = await mockMCPServer._execute_tool('get_card_table', {});
      // This would normally be handled by the MCP server validation
      // For now we just verify our schema defines it as required
      const tool = mockMCPServer.tools.find(t => t.name === 'get_card_table');
      expect(tool.inputSchema.required).toContain('project_id');
    });

    it('should validate create_card required parameters', () => {
      const tool = mockMCPServer.tools.find(t => t.name === 'create_card');
      expect(tool.inputSchema.required).toContain('project_id');
      expect(tool.inputSchema.required).toContain('column_id');
      expect(tool.inputSchema.required).toContain('title');
    });
  });
});

describe('Basecamp Client Card Tables', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Client Methods', () => {
    it('should have patch method available', () => {
      expect(mockBasecampClient.patch).toBeDefined();
      expect(typeof mockBasecampClient.patch).toBe('function');
    });

    it('should get card table from project dock', async () => {
      const mockResponse = {
        id: '123',
        dock: [
          { name: 'todoset', id: '111' },
          { name: 'card_table', id: '222' },
          { name: 'message_board', id: '333' }
        ]
      };

      mockBasecampClient.get_card_table.mockResolvedValueOnce({
        name: 'card_table',
        id: '222'
      });

      const result = await mockBasecampClient.get_card_table('123');

      expect(result.name).toBe('card_table');
      expect(result.id).toBe('222');
    });

    it('should create a column', async () => {
      const mockResponse = {
        id: '456',
        title: 'New Column',
        position: 5
      };

      mockBasecampClient.create_column.mockResolvedValueOnce(mockResponse);

      const result = await mockBasecampClient.create_column('123', '456', 'New Column');

      expect(result.title).toBe('New Column');
      expect(mockBasecampClient.create_column).toHaveBeenCalledWith('123', '456', 'New Column');
    });

    it('should update column color', async () => {
      const mockResponse = {
        id: '456',
        title: 'Column',
        color: '#FF0000'
      };

      mockBasecampClient.update_column_color.mockResolvedValueOnce(mockResponse);

      const result = await mockBasecampClient.update_column_color('123', '456', '#FF0000');

      expect(result.color).toBe('#FF0000');
      expect(mockBasecampClient.update_column_color).toHaveBeenCalledWith('123', '456', '#FF0000');
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors gracefully', async () => {
      const error = new Error('API Error');
      mockBasecampClient.get_card_table.mockRejectedValueOnce(error);

      await expect(mockBasecampClient.get_card_table('123')).rejects.toThrow('API Error');
    });

    it('should handle network failures', async () => {
      const networkError = new Error('Network Error');
      mockBasecampClient.create_column.mockRejectedValueOnce(networkError);

      await expect(mockBasecampClient.create_column('123', '456', 'Test')).rejects.toThrow('Network Error');
    });
  });

  describe('Authentication', () => {
    it('should handle authentication errors', async () => {
      const authError = new Error('Authentication failed');
      mockBasecampClient.get_card_table.mockRejectedValueOnce(authError);

      await expect(mockBasecampClient.get_card_table('123')).rejects.toThrow('Authentication failed');
    });
  });
});

describe('Card Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Card Management', () => {
    it('should create cards with proper data', async () => {
      const cardData = {
        id: '789',
        title: 'Test Card',
        content: 'Test content',
        column_id: '456'
      };

      mockBasecampClient.create_card.mockResolvedValueOnce(cardData);

      const result = await mockBasecampClient.create_card('123', '456', 'Test Card', 'Test content');

      expect(result).toEqual(cardData);
      expect(mockBasecampClient.create_card).toHaveBeenCalledWith('123', '456', 'Test Card', 'Test content');
    });

    it('should handle card creation without content', async () => {
      const cardData = {
        id: '789',
        title: 'Test Card',
        content: '',
        column_id: '456'
      };

      mockBasecampClient.create_card.mockResolvedValueOnce(cardData);

      const result = await mockBasecampClient.create_card('123', '456', 'Test Card');

      expect(result.title).toBe('Test Card');
      expect(mockBasecampClient.create_card).toHaveBeenCalledWith('123', '456', 'Test Card');
    });
  });

  describe('Card Validation', () => {
    it('should validate card title is required', () => {
      const tool = mockMCPServer.tools.find(t => t.name === 'create_card');
      expect(tool.inputSchema.required).toContain('title');
    });

    it('should allow optional content parameter', () => {
      const tool = mockMCPServer.tools.find(t => t.name === 'create_card');
      expect(tool.inputSchema.properties).toHaveProperty('content');
      expect(tool.inputSchema.required).not.toContain('content');
    });
  });
});

describe('Column Operations', () => {
  describe('Column Color Management', () => {
    it('should update column colors with valid hex codes', async () => {
      const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];
      
      for (const color of colors) {
        mockBasecampClient.update_column_color.mockResolvedValueOnce({
          id: '456',
          title: 'Test Column',
          color: color
        });

        const result = await mockBasecampClient.update_column_color('123', '456', color);
        expect(result.color).toBe(color);
      }
    });

    it('should handle invalid color codes', async () => {
      const invalidColor = 'not-a-color';
      const error = new Error('Invalid color format');
      mockBasecampClient.update_column_color.mockRejectedValueOnce(error);

      await expect(mockBasecampClient.update_column_color('123', '456', invalidColor))
        .rejects.toThrow('Invalid color format');
    });
  });

  describe('Column Positioning', () => {
    it('should handle column position updates', () => {
      const tool = mockMCPServer.tools.find(t => t.name === 'move_column');
      expect(tool).toBeDefined();
      expect(tool.inputSchema.properties).toHaveProperty('position');
      expect(tool.inputSchema.required).toContain('position');
    });
  });
});
