import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { BasecampClient } from '../lib/basecamp-client.js';
import type {
  BasecampProject,
  TodoList,
  Todo,
  Card,
  CardTable,
  Column,
  CardStep,
  Comment,
  CampfireLine,
  Document,
  Upload,
  Webhook,
  DailyCheckIn,
  QuestionAnswer
} from '../types/basecamp.js';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('BasecampClient', () => {
  let client: BasecampClient;
  let mockAxiosInstance: any;

  const mockProject: BasecampProject = {
    id: '123',
    name: 'Test Project',
    description: 'A test project',
    dock: [
      { id: '456', name: 'todoset', enabled: true, position: 1, url: 'test-url', app_url: 'test-app-url' },
      { id: '789', name: 'card_table', enabled: true, position: 2, url: 'test-url', app_url: 'test-app-url' },
      { id: '101', name: 'questionnaire', enabled: true, position: 3, url: 'test-url', app_url: 'test-app-url' }
    ],
    status: 'active',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    url: 'test-url',
    app_url: 'test-app-url'
  };

  const mockTodoList: TodoList = {
    id: '456',
    title: 'Test Todo List',
    description: 'A test todo list',
    todos: [],
    status: 'active',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    url: 'test-url',
    app_url: 'test-app-url'
  };

  const mockTodo: Todo = {
    id: '789',
    title: 'Test Todo',
    description: 'A test todo',
    completed: false,
    due_on: '2023-12-31',
    assignees: [],
    completion: null,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    url: 'test-url',
    app_url: 'test-app-url'
  };

  const mockCard: Card = {
    id: '101',
    title: 'Test Card',
    content: 'A test card',
    due_on: '2023-12-31',
    completed: false,
    assignees: [],
    steps: [],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    url: 'test-url',
    app_url: 'test-app-url'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockAxiosInstance = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      patch: vi.fn(),
      delete: vi.fn(),
      defaults: {
        auth: {},
        headers: { common: {} }
      }
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Constructor and Authentication', () => {
    it('should create client with basic auth', () => {
      client = new BasecampClient({
        username: 'testuser',
        password: 'testpass',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'basic'
      });

      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://3.basecampapi.com/12345',
        headers: {
          'User-Agent': 'Test Agent',
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      
      expect(mockAxiosInstance.defaults.auth).toEqual({
        username: 'testuser',
        password: 'testpass'
      });
    });

    it('should create client with OAuth', () => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });

      expect(mockAxiosInstance.defaults.headers.common['Authorization']).toBe('Bearer test-token');
    });

    it('should default to basic auth mode', () => {
      client = new BasecampClient({
        username: 'testuser',
        password: 'testpass',
        accountId: '12345',
        userAgent: 'Test Agent'
      });

      expect(mockAxiosInstance.defaults.auth).toEqual({
        username: 'testuser',
        password: 'testpass'
      });
    });

    it('should throw error for basic auth without credentials', () => {
      expect(() => new BasecampClient({
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'basic'
      })).toThrow('Username and password required for basic auth');
    });

    it('should throw error for OAuth without access token', () => {
      expect(() => new BasecampClient({
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      })).toThrow('Access token required for OAuth auth');
    });
  });

  describe('Connection Testing', () => {
    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should return success for valid connection', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [mockProject] });

      const result = await client.testConnection();

      expect(result).toEqual({ success: true, message: 'Connection successful' });
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects.json');
    });

    it('should return failure for invalid connection', async () => {
      const error = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(error);

      const result = await client.testConnection();

      expect(result).toEqual({ success: false, message: 'Connection failed: Network error' });
    });

    it('should handle unknown errors in connection test', async () => {
      mockAxiosInstance.get.mockRejectedValue('Unknown error');

      const result = await client.testConnection();

      expect(result).toEqual({ success: false, message: 'Connection failed: Unknown error' });
    });
  });

  describe('Project Methods', () => {
    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should get all projects', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [mockProject] });

      const projects = await client.getProjects();

      expect(projects).toEqual([mockProject]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects.json');
    });

    it('should get specific project', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockProject });

      const project = await client.getProject('123');

      expect(project).toEqual(mockProject);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects/123.json');
    });
  });

  describe('Todo Methods', () => {
    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should get todo lists', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockProject }) // getProject call
        .mockResolvedValueOnce({ data: [mockTodoList] }); // getTodoLists call

      const todoLists = await client.getTodoLists('123');

      expect(todoLists).toEqual([mockTodoList]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects/123.json');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/todosets/456/todolists.json');
    });

    it('should throw error when no todoset found', async () => {
      const projectWithoutTodoset = { ...mockProject, dock: [] };
      mockAxiosInstance.get.mockResolvedValue({ data: projectWithoutTodoset });

      await expect(client.getTodoLists('123')).rejects.toThrow('No todoset found for project 123');
    });

    it('should get todos from todolist', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [mockTodo] });

      const todos = await client.getTodos('123', '456');

      expect(todos).toEqual([mockTodo]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/todolists/456/todos.json');
    });

    it('should get specific todo', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockTodo });

      const todo = await client.getTodo('789');

      expect(todo).toEqual(mockTodo);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/todos/789.json');
    });
  });

  describe('Card Table Methods', () => {
    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should get card tables', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockProject });

      const cardTables = await client.getCardTables('123');

      expect(cardTables).toEqual([mockProject.dock[1]]); // card_table entry
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects/123.json');
    });

    it('should get primary card table', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockProject });

      const cardTable = await client.getCardTable('123');

      expect(cardTable).toEqual(mockProject.dock[1]);
    });

    it('should throw error when no card tables found', async () => {
      const projectWithoutCardTable = { 
        ...mockProject, 
        dock: [mockProject.dock[0]] // Only todoset, no card_table
      };
      mockAxiosInstance.get.mockResolvedValue({ data: projectWithoutCardTable });

      await expect(client.getCardTable('123')).rejects.toThrow('No card tables found for project: 123');
    });

    it('should get card table details', async () => {
      const mockCardTable: CardTable = {
        id: '789',
        title: 'Test Card Table',
        lists: [],
        status: 'active'
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockCardTable });

      const cardTableDetails = await client.getCardTableDetails('123', '789');

      expect(cardTableDetails).toEqual(mockCardTable);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/card_tables/789.json');
    });

    it('should handle empty card table (204 response)', async () => {
      const error = { response: { status: 204 } };
      mockAxiosInstance.get.mockRejectedValue(error);

      const cardTableDetails = await client.getCardTableDetails('123', '789');

      expect(cardTableDetails).toEqual({ id: '789', title: 'Card Table', lists: [], status: 'empty' });
    });

    it('should rethrow non-204 errors', async () => {
      const error = { response: { status: 500 } };
      mockAxiosInstance.get.mockRejectedValue(error);

      await expect(client.getCardTableDetails('123', '789')).rejects.toEqual(error);
    });
  });

  describe('Column Methods', () => {
    const mockColumn: Column = {
      id: '111',
      title: 'Test Column',
      position: 1,
      color: 'blue',
      cards: []
    };

    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should get columns', async () => {
      const mockCardTable: CardTable = {
        id: '789',
        title: 'Test Card Table',
        lists: [mockColumn],
        status: 'active'
      };
      mockAxiosInstance.get.mockResolvedValue({ data: mockCardTable });

      const columns = await client.getColumns('123', '789');

      expect(columns).toEqual([mockColumn]);
    });

    it('should get specific column', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockColumn });

      const column = await client.getColumn('123', '111');

      expect(column).toEqual(mockColumn);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/card_tables/columns/111.json');
    });

    it('should create column', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockColumn });

      const column = await client.createColumn('123', '789', 'New Column');

      expect(column).toEqual(mockColumn);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/card_tables/789/columns.json', {
        title: 'New Column'
      });
    });

    it('should update column', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: mockColumn });

      const column = await client.updateColumn('123', '111', 'Updated Column');

      expect(column).toEqual(mockColumn);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/buckets/123/card_tables/columns/111.json', {
        title: 'Updated Column'
      });
    });

    it('should move column', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await client.moveColumn('123', '111', 2, '789');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/card_tables/789/moves.json', {
        source_id: '111',
        target_id: '789',
        position: 2
      });
    });

    it('should update column color', async () => {
      mockAxiosInstance.patch.mockResolvedValue({ data: mockColumn });

      const column = await client.updateColumnColor('123', '111', 'red');

      expect(column).toEqual(mockColumn);
      expect(mockAxiosInstance.patch).toHaveBeenCalledWith('/buckets/123/card_tables/columns/111/color.json', {
        color: 'red'
      });
    });

    it('should put column on hold', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await client.putColumnOnHold('123', '111');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/card_tables/columns/111/on_hold.json');
    });

    it('should remove column hold', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await client.removeColumnHold('123', '111');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/buckets/123/card_tables/columns/111/on_hold.json');
    });

    it('should watch column', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await client.watchColumn('123', '111');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/card_tables/lists/111/subscription.json');
    });

    it('should unwatch column', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await client.unwatchColumn('123', '111');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/buckets/123/card_tables/lists/111/subscription.json');
    });
  });

  describe('Card Methods', () => {
    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should get cards', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [mockCard] });

      const cards = await client.getCards('123', '111');

      expect(cards).toEqual([mockCard]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/card_tables/lists/111/cards.json');
    });

    it('should get specific card', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockCard });

      const card = await client.getCard('123', '101');

      expect(card).toEqual(mockCard);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/card_tables/cards/101.json');
    });

    it('should create card with minimal data', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockCard });

      const card = await client.createCard('123', '111', 'New Card');

      expect(card).toEqual(mockCard);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/card_tables/lists/111/cards.json', {
        title: 'New Card'
      });
    });

    it('should create card with full data', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockCard });

      const card = await client.createCard('123', '111', 'New Card', 'Card content', '2023-12-31', true);

      expect(card).toEqual(mockCard);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/card_tables/lists/111/cards.json', {
        title: 'New Card',
        content: 'Card content',
        due_on: '2023-12-31',
        notify: true
      });
    });

    it('should update card with partial data', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: mockCard });

      const card = await client.updateCard('123', '101', 'Updated Card');

      expect(card).toEqual(mockCard);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/buckets/123/card_tables/cards/101.json', {
        title: 'Updated Card'
      });
    });

    it('should update card with full data', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: mockCard });

      const card = await client.updateCard('123', '101', 'Updated Card', 'Updated content', '2023-12-31', ['user1']);

      expect(card).toEqual(mockCard);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/buckets/123/card_tables/cards/101.json', {
        title: 'Updated Card',
        content: 'Updated content',
        due_on: '2023-12-31',
        assignee_ids: ['user1']
      });
    });

    it('should move card', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: {} });

      await client.moveCard('123', '101', '222');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/card_tables/cards/101/moves.json', {
        column_id: '222'
      });
    });

    it('should complete card', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { completed: true } });

      const result = await client.completeCard('123', '101');

      expect(result).toEqual({ completed: true });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/todos/101/completion.json');
    });

    it('should uncomplete card', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await client.uncompleteCard('123', '101');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/buckets/123/todos/101/completion.json');
    });
  });

  describe('Card Step Methods', () => {
    const mockCardStep: CardStep = {
      id: '333',
      title: 'Test Step',
      completed: false,
      assignees: [],
      due_on: '2023-12-31',
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      url: 'test-url',
      app_url: 'test-app-url'
    };

    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should get card steps', async () => {
      const cardWithSteps = { ...mockCard, steps: [mockCardStep] };
      mockAxiosInstance.get.mockResolvedValue({ data: cardWithSteps });

      const steps = await client.getCardSteps('123', '101');

      expect(steps).toEqual([mockCardStep]);
    });

    it('should return empty array for card without steps', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockCard });

      const steps = await client.getCardSteps('123', '101');

      expect(steps).toEqual([]);
    });

    it('should create card step with minimal data', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockCardStep });

      const step = await client.createCardStep('123', '101', 'New Step');

      expect(step).toEqual(mockCardStep);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/card_tables/cards/101/steps.json', {
        title: 'New Step'
      });
    });

    it('should create card step with full data', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockCardStep });

      const step = await client.createCardStep('123', '101', 'New Step', '2023-12-31', ['user1']);

      expect(step).toEqual(mockCardStep);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/card_tables/cards/101/steps.json', {
        title: 'New Step',
        due_on: '2023-12-31',
        assignee_ids: ['user1']
      });
    });

    it('should get specific card step', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockCardStep });

      const step = await client.getCardStep('123', '333');

      expect(step).toEqual(mockCardStep);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/card_tables/steps/333.json');
    });

    it('should update card step', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: mockCardStep });

      const step = await client.updateCardStep('123', '333', 'Updated Step', '2023-12-31', ['user1']);

      expect(step).toEqual(mockCardStep);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/buckets/123/card_tables/steps/333.json', {
        title: 'Updated Step',
        due_on: '2023-12-31',
        assignee_ids: ['user1']
      });
    });

    it('should delete card step', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await client.deleteCardStep('123', '333');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/buckets/123/card_tables/steps/333.json');
    });

    it('should complete card step', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: { completed: true } });

      const result = await client.completeCardStep('123', '333');

      expect(result).toEqual({ completed: true });
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/todos/333/completion.json');
    });

    it('should uncomplete card step', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await client.uncompleteCardStep('123', '333');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/buckets/123/todos/333/completion.json');
    });
  });

  describe('Communication Methods', () => {
    const mockCampfireLine: CampfireLine = {
      id: '444',
      content: 'Test message',
      creator: { id: 'user1', name: 'Test User' },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };

    const mockComment: Comment = {
      id: '555',
      content: 'Test comment',
      creator: { id: 'user1', name: 'Test User' },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };

    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should get campfire lines', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [mockCampfireLine] });

      const lines = await client.getCampfireLines('123', '444');

      expect(lines).toEqual([mockCampfireLine]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/chats/444/lines.json');
    });

    it('should get comments', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [mockComment] });

      const comments = await client.getComments('123', '555');

      expect(comments).toEqual([mockComment]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/recordings/555/comments.json');
    });
  });

  describe('Document Methods', () => {
    const mockDocument: Document = {
      id: '666',
      title: 'Test Document',
      content: 'Test content',
      creator: { id: 'user1', name: 'Test User' },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      url: 'test-url',
      app_url: 'test-app-url'
    };

    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should get documents', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [mockDocument] });

      const documents = await client.getDocuments('123', '777');

      expect(documents).toEqual([mockDocument]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/vaults/777/documents.json');
    });

    it('should get specific document', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockDocument });

      const document = await client.getDocument('123', '666');

      expect(document).toEqual(mockDocument);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/documents/666.json');
    });

    it('should create document with default status', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockDocument });

      const document = await client.createDocument('123', '777', 'New Document', 'Document content');

      expect(document).toEqual(mockDocument);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/vaults/777/documents.json', {
        title: 'New Document',
        content: 'Document content',
        status: 'active'
      });
    });

    it('should create document with custom status', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockDocument });

      const document = await client.createDocument('123', '777', 'New Document', 'Document content', 'draft');

      expect(document).toEqual(mockDocument);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/vaults/777/documents.json', {
        title: 'New Document',
        content: 'Document content',
        status: 'draft'
      });
    });

    it('should update document', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: mockDocument });

      const document = await client.updateDocument('123', '666', 'Updated Title', 'Updated content');

      expect(document).toEqual(mockDocument);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/buckets/123/documents/666.json', {
        title: 'Updated Title',
        content: 'Updated content'
      });
    });

    it('should update document with partial data', async () => {
      mockAxiosInstance.put.mockResolvedValue({ data: mockDocument });

      const document = await client.updateDocument('123', '666', 'Updated Title');

      expect(document).toEqual(mockDocument);
      expect(mockAxiosInstance.put).toHaveBeenCalledWith('/buckets/123/documents/666.json', {
        title: 'Updated Title'
      });
    });

    it('should trash document', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await client.trashDocument('123', '666');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/buckets/123/documents/666.json');
    });
  });

  describe('File Methods', () => {
    const mockUpload: Upload = {
      id: '888',
      filename: 'test.txt',
      byte_size: 1024,
      content_type: 'text/plain',
      creator: { id: 'user1', name: 'Test User' },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      url: 'test-url',
      app_url: 'test-app-url'
    };

    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should get uploads from project', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [mockUpload] });

      const uploads = await client.getUploads('123');

      expect(uploads).toEqual([mockUpload]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/uploads.json');
    });

    it('should get uploads from vault', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [mockUpload] });

      const uploads = await client.getUploads('123', '777');

      expect(uploads).toEqual([mockUpload]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/vaults/777/uploads.json');
    });

    it('should get specific upload', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: mockUpload });

      const upload = await client.getUpload('123', '888');

      expect(upload).toEqual(mockUpload);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/uploads/888.json');
    });

    it('should throw error for createAttachment (not implemented)', async () => {
      await expect(client.createAttachment('test.txt', 'Test File')).rejects.toThrow(
        'File upload not implemented in TypeScript version yet'
      );
    });
  });

  describe('Webhook Methods', () => {
    const mockWebhook: Webhook = {
      id: '999',
      payload_url: 'https://example.com/webhook',
      types: ['todo.created', 'card.created'],
      creator: { id: 'user1', name: 'Test User' },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      url: 'test-url',
      app_url: 'test-app-url'
    };

    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should get webhooks', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [mockWebhook] });

      const webhooks = await client.getWebhooks('123');

      expect(webhooks).toEqual([mockWebhook]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/webhooks.json');
    });

    it('should create webhook without types', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockWebhook });

      const webhook = await client.createWebhook('123', 'https://example.com/webhook');

      expect(webhook).toEqual(mockWebhook);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/webhooks.json', {
        payload_url: 'https://example.com/webhook'
      });
    });

    it('should create webhook with types', async () => {
      mockAxiosInstance.post.mockResolvedValue({ data: mockWebhook });

      const webhook = await client.createWebhook('123', 'https://example.com/webhook', ['todo.created']);

      expect(webhook).toEqual(mockWebhook);
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/buckets/123/webhooks.json', {
        payload_url: 'https://example.com/webhook',
        types: ['todo.created']
      });
    });

    it('should delete webhook', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: {} });

      await client.deleteWebhook('123', '999');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/buckets/123/webhooks/999.json');
    });
  });

  describe('Check-in Methods', () => {
    const mockDailyCheckIn: DailyCheckIn = {
      id: '1010',
      title: 'Daily Check-in',
      paused: false,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };

    const mockQuestionAnswer: QuestionAnswer = {
      id: '1111',
      content: 'Test answer',
      creator: { id: 'user1', name: 'Test User' },
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z'
    };

    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should get daily check-ins', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockProject }) // getProject call
        .mockResolvedValueOnce({ data: [mockDailyCheckIn] }); // getDailyCheckIns call

      const checkIns = await client.getDailyCheckIns('123');

      expect(checkIns).toEqual([mockDailyCheckIn]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/projects/123.json');
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/buckets/123/questionnaires/101/questions.json',
        { params: { page: 1 } }
      );
    });

    it('should get daily check-ins with custom page', async () => {
      mockAxiosInstance.get
        .mockResolvedValueOnce({ data: mockProject })
        .mockResolvedValueOnce({ data: [mockDailyCheckIn] });

      const checkIns = await client.getDailyCheckIns('123', 2);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/buckets/123/questionnaires/101/questions.json',
        { params: { page: 2 } }
      );
    });

    it('should throw error when no questionnaire found', async () => {
      const projectWithoutQuestionnaire = { ...mockProject, dock: [mockProject.dock[0]] };
      mockAxiosInstance.get.mockResolvedValue({ data: projectWithoutQuestionnaire });

      await expect(client.getDailyCheckIns('123')).rejects.toThrow('No questionnaire found for project 123');
    });

    it('should get question answers', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [mockQuestionAnswer] });

      const answers = await client.getQuestionAnswers('123', '1010');

      expect(answers).toEqual([mockQuestionAnswer]);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/buckets/123/questions/1010/answers.json',
        { params: { page: 1 } }
      );
    });

    it('should get question answers with custom page', async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: [mockQuestionAnswer] });

      const answers = await client.getQuestionAnswers('123', '1010', 3);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/buckets/123/questions/1010/answers.json',
        { params: { page: 3 } }
      );
    });
  });

  describe('Utility Methods', () => {
    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should get events', async () => {
      const mockEvents = [{ id: '1212', type: 'created' }];
      mockAxiosInstance.get.mockResolvedValue({ data: mockEvents });

      const events = await client.getEvents('123', '555');

      expect(events).toEqual(mockEvents);
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/buckets/123/recordings/555/events.json');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      client = new BasecampClient({
        accessToken: 'test-token',
        accountId: '12345',
        userAgent: 'Test Agent',
        authMode: 'oauth'
      });
    });

    it('should propagate axios errors', async () => {
      const axiosError = new Error('Network error');
      mockAxiosInstance.get.mockRejectedValue(axiosError);

      await expect(client.getProjects()).rejects.toThrow('Network error');
    });

    it('should handle HTTP error responses', async () => {
      const httpError = {
        response: {
          status: 404,
          data: { error: 'Not found' }
        }
      };
      mockAxiosInstance.get.mockRejectedValue(httpError);

      await expect(client.getProject('999')).rejects.toEqual(httpError);
    });
  });
});
