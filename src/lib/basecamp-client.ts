import axios, { AxiosInstance, AxiosResponse } from 'axios';
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
  Message,
  Document,
  Upload,
  Webhook,
  DailyCheckIn,
  QuestionAnswer,
  OAuthTokens,
  AuthMode,
  Person,
  Assignment,
  AssignmentScope,
  MyAssignmentsResponse,
  TodoCreateBody,
  TodoUpdateBody,
  TodolistCreateBody,
  TodolistUpdateBody,
  CommentCreateBody,
  CommentUpdateBody,
} from '../types/basecamp.js';
import { parseNextLink } from './pagination.js';
import { getDockEntryWithDetails } from './resources/dock.js';
import * as todosResource from './resources/todos.js';
import * as todolistsResource from './resources/todolists.js';
import * as commentsResource from './resources/comments.js';

const VALID_ASSIGNMENT_SCOPES: AssignmentScope[] = [
  'overdue',
  'due_today',
  'due_tomorrow',
  'due_later_this_week',
  'due_next_week',
  'due_later',
];

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// Mon-start week. Returns ISO date for Monday of week containing `iso`.
function weekStart(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const dow = d.getUTCDay(); // 0=Sun..6=Sat
  const offsetToMon = dow === 0 ? -6 : 1 - dow;
  return addDays(iso, offsetToMon);
}

function matchesScope(dueOn: string | null | undefined, scope: AssignmentScope, today: string): boolean {
  if (!dueOn) return false;
  const tomorrow = addDays(today, 1);
  const thisMon = weekStart(today);
  const thisSun = addDays(thisMon, 6);
  const nextMon = addDays(thisMon, 7);
  const nextSun = addDays(nextMon, 6);

  switch (scope) {
    case 'overdue':            return dueOn < today;
    case 'due_today':          return dueOn === today;
    case 'due_tomorrow':       return dueOn === tomorrow;
    case 'due_later_this_week': return dueOn > tomorrow && dueOn <= thisSun;
    case 'due_next_week':       return dueOn >= nextMon && dueOn <= nextSun;
    case 'due_later':           return dueOn > nextSun;
  }
}

export class BasecampClient {
  private client: AxiosInstance;
  private accountId: string;
  private userAgent: string;
  private authMode: AuthMode;

  constructor(options: {
    username?: string;
    password?: string;
    accessToken?: string;
    accountId: string;
    userAgent: string;
    authMode?: AuthMode;
  }) {
    this.accountId = options.accountId;
    this.userAgent = options.userAgent;
    this.authMode = options.authMode || 'basic';

    const baseURL = `https://3.basecampapi.com/${this.accountId}`;
    
    this.client = axios.create({
      baseURL,
      headers: {
        'User-Agent': this.userAgent,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Set up authentication
    if (this.authMode === 'basic') {
      if (!options.username || !options.password) {
        throw new Error('Username and password required for basic auth');
      }
      this.client.defaults.auth = {
        username: options.username,
        password: options.password,
      };
    } else if (this.authMode === 'oauth') {
      if (!options.accessToken) {
        throw new Error('Access token required for OAuth auth');
      }
      this.client.defaults.headers.common['Authorization'] = `Bearer ${options.accessToken}`;
    }
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      await this.getProjects();
      return { success: true, message: 'Connection successful' };
    } catch (error) {
      return { 
        success: false, 
        message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  // Project methods
  async getProjects(): Promise<BasecampProject[]> {
    const response = await this.client.get('/projects.json');
    return response.data;
  }

  async getProject(projectId: string): Promise<BasecampProject> {
    const response = await this.client.get(`/projects/${projectId}.json`);
    return response.data;
  }

  // Todo methods
  async getTodoLists(projectId: string): Promise<TodoList[]> {
    // First get the project to find the todoset
    const project = await this.getProject(projectId);
    const todoset = project.dock.find(item => item.name === 'todoset');
    
    if (!todoset) {
      throw new Error(`No todoset found for project ${projectId}`);
    }

    const response = await this.client.get(`/buckets/${projectId}/todosets/${todoset.id}/todolists.json`);
    return response.data;
  }

  async getTodolist(projectId: string, todolistId: string): Promise<TodoList> {
    return todolistsResource.getTodolist(this.client, projectId, todolistId);
  }

  async createTodolist(
    projectId: string,
    todosetId: string,
    body: TodolistCreateBody,
  ): Promise<TodoList> {
    return todolistsResource.createTodolist(this.client, projectId, todosetId, body);
  }

  async updateTodolist(
    projectId: string,
    todolistId: string,
    patch: TodolistUpdateBody,
  ): Promise<TodoList> {
    return todolistsResource.updateTodolist(this.client, projectId, todolistId, patch);
  }

  async getTodos(projectId: string, todolistId: string): Promise<Todo[]> {
    const response = await this.client.get(`/buckets/${projectId}/todolists/${todolistId}/todos.json`);
    return response.data;
  }

  async getTodo(projectId: string, todoId: string): Promise<Todo> {
    return todosResource.getTodo(this.client, projectId, todoId);
  }

  async createTodo(
    projectId: string,
    todolistId: string,
    body: TodoCreateBody,
  ): Promise<Todo> {
    return todosResource.createTodo(this.client, projectId, todolistId, body);
  }

  async updateTodo(
    projectId: string,
    todoId: string,
    patch: TodoUpdateBody,
  ): Promise<Todo> {
    return todosResource.updateTodo(this.client, projectId, todoId, patch);
  }

  async completeTodo(projectId: string, todoId: string): Promise<void> {
    return todosResource.completeTodo(this.client, projectId, todoId);
  }

  async uncompleteTodo(projectId: string, todoId: string): Promise<void> {
    return todosResource.uncompleteTodo(this.client, projectId, todoId);
  }

  async repositionTodo(
    projectId: string,
    todoId: string,
    position: number,
    parentId?: string,
  ): Promise<void> {
    return todosResource.repositionTodo(this.client, projectId, todoId, position, parentId);
  }

  // My / assignments / people methods
  async getMyProfile(): Promise<Person> {
    const response = await this.client.get('/my/profile.json');
    return response.data;
  }

  async getMyAssignments(): Promise<MyAssignmentsResponse> {
    const response = await this.client.get('/my/assignments.json');
    return response.data;
  }

  async getMyCompletedAssignments(): Promise<Assignment[]> {
    const response = await this.client.get('/my/assignments/completed.json');
    return response.data;
  }

  async getMyDueAssignments(scope?: AssignmentScope): Promise<Assignment[]> {
    if (scope !== undefined && !VALID_ASSIGNMENT_SCOPES.includes(scope)) {
      throw new Error(
        `Invalid scope '${scope}'. Valid options: ${VALID_ASSIGNMENT_SCOPES.join(', ')}`
      );
    }
    const params: Record<string, string> = {};
    if (scope) params.scope = scope;
    const response = await this.client.get('/my/assignments/due.json', { params });
    return response.data;
  }

  async getPeople(): Promise<Person[]> {
    const response = await this.client.get('/people.json');
    return response.data;
  }

  async getProjectPeople(projectId: string): Promise<Person[]> {
    const response = await this.client.get(`/projects/${projectId}/people.json`);
    return response.data;
  }

  async getRecordingsTodos(opts: { bucket?: string; status?: 'active' | 'archived' | 'trashed' } = {}): Promise<any[]> {
    const params: Record<string, string> = { type: 'Todo' };
    if (opts.bucket) params.bucket = opts.bucket;
    if (opts.status) params.status = opts.status;

    const all: any[] = [];
    let response = await this.client.get('/projects/recordings.json', { params });
    while (true) {
      all.push(...response.data);
      const next = parseNextLink(response.headers?.link || response.headers?.Link);
      if (!next) break;
      response = await this.client.get(next);
    }
    return all;
  }

  async findAssignmentsForPerson(opts: {
    personId?: number | string;
    personName?: string;
    scope?: AssignmentScope;
    bucket?: string;
    today?: string;
  }): Promise<any[]> {
    if (opts.scope !== undefined && !VALID_ASSIGNMENT_SCOPES.includes(opts.scope)) {
      throw new Error(
        `Invalid scope '${opts.scope}'. Valid options: ${VALID_ASSIGNMENT_SCOPES.join(', ')}`
      );
    }

    let personId = opts.personId;
    const needle = opts.personName?.toLowerCase();

    if (!personId && needle) {
      const people = await this.getPeople();
      const match = people.find(p => p.name?.toLowerCase().includes(needle));
      if (match) personId = match.id;
    }

    if (!personId && !needle) {
      throw new Error('findAssignmentsForPerson requires either personId or personName');
    }

    const todos = await this.getRecordingsTodos({ bucket: opts.bucket });

    if (!personId && needle) {
      // /people.json is filtered to current-user-visible. Fall back to assignees seen in recordings.
      for (const t of todos) {
        const hit = (t.assignees || []).find((a: any) => a.name?.toLowerCase().includes(needle));
        if (hit) { personId = hit.id; break; }
      }
      if (!personId) {
        throw new Error(`No person matching '${opts.personName}' visible to current user (checked /people.json and recording assignees)`);
      }
    }
    const idStr = String(personId);
    const assigned = todos.filter(t =>
      Array.isArray(t.assignees) && t.assignees.some((a: any) => String(a.id) === idStr)
    );

    if (!opts.scope) return assigned;

    const today = opts.today || new Date().toISOString().slice(0, 10);
    return assigned.filter(t => matchesScope(t.due_on, opts.scope!, today));
  }

  // Card Table methods
  async getCardTables(projectId: string): Promise<any[]> {
    const project = await this.getProject(projectId);
    return project.dock.filter(item => 
      item.name === 'kanban_board' || item.name === 'card_table'
    );
  }

  async getCardTable(projectId: string): Promise<any> {
    const cardTables = await this.getCardTables(projectId);
    if (!cardTables.length) {
      throw new Error(`No card tables found for project: ${projectId}`);
    }
    return cardTables[0];
  }

  async getCardTableDetails(projectId: string, cardTableId: string): Promise<CardTable> {
    try {
      const response = await this.client.get(`/buckets/${projectId}/card_tables/${cardTableId}.json`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 204) {
        return { id: cardTableId, title: 'Card Table', lists: [], status: 'empty' };
      }
      throw error;
    }
  }

  async getCardTableWithDetails(projectId: string): Promise<CardTable> {
    return getDockEntryWithDetails<CardTable>(
      this.client,
      projectId,
      'card_table',
      (p, id) => `/buckets/${p}/card_tables/${id}.json`,
    );
  }

  // Column methods
  async getColumns(projectId: string, cardTableId: string): Promise<Column[]> {
    const cardTableDetails = await this.getCardTableDetails(projectId, cardTableId);
    return cardTableDetails.lists || [];
  }

  async getColumn(projectId: string, columnId: string): Promise<Column> {
    const response = await this.client.get(`/buckets/${projectId}/card_tables/columns/${columnId}.json`);
    return response.data;
  }

  async createColumn(projectId: string, cardTableId: string, title: string): Promise<Column> {
    const response = await this.client.post(`/buckets/${projectId}/card_tables/${cardTableId}/columns.json`, {
      title,
    });
    return response.data;
  }

  async updateColumn(projectId: string, columnId: string, title: string): Promise<Column> {
    const response = await this.client.put(`/buckets/${projectId}/card_tables/columns/${columnId}.json`, {
      title,
    });
    return response.data;
  }

  async moveColumn(projectId: string, columnId: string, position: number, cardTableId: string): Promise<void> {
    await this.client.post(`/buckets/${projectId}/card_tables/${cardTableId}/moves.json`, {
      source_id: columnId,
      target_id: cardTableId,
      position,
    });
  }

  async updateColumnColor(projectId: string, columnId: string, color: string): Promise<Column> {
    const response = await this.client.patch(`/buckets/${projectId}/card_tables/columns/${columnId}/color.json`, {
      color,
    });
    return response.data;
  }

  async putColumnOnHold(projectId: string, columnId: string): Promise<void> {
    await this.client.post(`/buckets/${projectId}/card_tables/columns/${columnId}/on_hold.json`);
  }

  async removeColumnHold(projectId: string, columnId: string): Promise<void> {
    await this.client.delete(`/buckets/${projectId}/card_tables/columns/${columnId}/on_hold.json`);
  }

  async watchColumn(projectId: string, columnId: string): Promise<void> {
    await this.client.post(`/buckets/${projectId}/card_tables/lists/${columnId}/subscription.json`);
  }

  async unwatchColumn(projectId: string, columnId: string): Promise<void> {
    await this.client.delete(`/buckets/${projectId}/card_tables/lists/${columnId}/subscription.json`);
  }

  // Card methods
  async getCards(projectId: string, columnId: string): Promise<Card[]> {
    const response = await this.client.get(`/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`);
    return response.data;
  }

  async getCard(projectId: string, cardId: string): Promise<Card> {
    const response = await this.client.get(`/buckets/${projectId}/card_tables/cards/${cardId}.json`);
    return response.data;
  }

  async createCard(
    projectId: string,
    columnId: string,
    title: string,
    content?: string,
    dueOn?: string,
    notify = false
  ): Promise<Card> {
    const data: any = { title };
    if (content) data.content = content;
    if (dueOn) data.due_on = dueOn;
    if (notify) data.notify = notify;

    const response = await this.client.post(`/buckets/${projectId}/card_tables/lists/${columnId}/cards.json`, data);
    return response.data;
  }

  async updateCard(
    projectId: string,
    cardId: string,
    title?: string,
    content?: string,
    dueOn?: string,
    assigneeIds?: string[]
  ): Promise<Card> {
    const data: any = {};
    if (title) data.title = title;
    if (content) data.content = content;
    if (dueOn) data.due_on = dueOn;
    if (assigneeIds) data.assignee_ids = assigneeIds;

    const response = await this.client.put(`/buckets/${projectId}/card_tables/cards/${cardId}.json`, data);
    return response.data;
  }

  async moveCard(projectId: string, cardId: string, columnId: string): Promise<void> {
    await this.client.post(`/buckets/${projectId}/card_tables/cards/${cardId}/moves.json`, {
      column_id: columnId,
    });
  }

  async completeCard(projectId: string, cardId: string): Promise<any> {
    const response = await this.client.post(`/buckets/${projectId}/todos/${cardId}/completion.json`);
    return response.data;
  }

  async uncompleteCard(projectId: string, cardId: string): Promise<void> {
    await this.client.delete(`/buckets/${projectId}/todos/${cardId}/completion.json`);
  }

  // Card Step methods
  async getCardSteps(projectId: string, cardId: string): Promise<CardStep[]> {
    const card = await this.getCard(projectId, cardId);
    return card.steps || [];
  }

  async createCardStep(
    projectId: string,
    cardId: string,
    title: string,
    dueOn?: string,
    assigneeIds?: string[]
  ): Promise<CardStep> {
    const data: any = { title };
    if (dueOn) data.due_on = dueOn;
    if (assigneeIds) data.assignee_ids = assigneeIds;

    const response = await this.client.post(`/buckets/${projectId}/card_tables/cards/${cardId}/steps.json`, data);
    return response.data;
  }

  async getCardStep(projectId: string, stepId: string): Promise<CardStep> {
    const response = await this.client.get(`/buckets/${projectId}/card_tables/steps/${stepId}.json`);
    return response.data;
  }

  async updateCardStep(
    projectId: string,
    stepId: string,
    title?: string,
    dueOn?: string,
    assigneeIds?: string[]
  ): Promise<CardStep> {
    const data: any = {};
    if (title) data.title = title;
    if (dueOn) data.due_on = dueOn;
    if (assigneeIds) data.assignee_ids = assigneeIds;

    const response = await this.client.put(`/buckets/${projectId}/card_tables/steps/${stepId}.json`, data);
    return response.data;
  }

  async deleteCardStep(projectId: string, stepId: string): Promise<void> {
    await this.client.delete(`/buckets/${projectId}/card_tables/steps/${stepId}.json`);
  }

  async completeCardStep(projectId: string, stepId: string): Promise<any> {
    const response = await this.client.post(`/buckets/${projectId}/todos/${stepId}/completion.json`);
    return response.data;
  }

  async uncompleteCardStep(projectId: string, stepId: string): Promise<void> {
    await this.client.delete(`/buckets/${projectId}/todos/${stepId}/completion.json`);
  }

  // Communication methods
  async getCampfireLines(projectId: string, campfireId: string): Promise<CampfireLine[]> {
    const response = await this.client.get(`/buckets/${projectId}/chats/${campfireId}/lines.json`);
    return response.data;
  }

  async getComments(projectId: string, recordingId: string): Promise<Comment[]> {
    const response = await this.client.get(`/buckets/${projectId}/recordings/${recordingId}/comments.json`);
    return response.data;
  }

  async getComment(projectId: string, commentId: string): Promise<Comment> {
    return commentsResource.getComment(this.client, projectId, commentId);
  }

  async createComment(
    projectId: string,
    recordingId: string,
    body: CommentCreateBody,
  ): Promise<Comment> {
    return commentsResource.createComment(this.client, projectId, recordingId, body);
  }

  async updateComment(
    projectId: string,
    commentId: string,
    patch: CommentUpdateBody,
  ): Promise<Comment> {
    return commentsResource.updateComment(this.client, projectId, commentId, patch);
  }

  // Document methods
  async getDocuments(projectId: string, vaultId: string): Promise<Document[]> {
    const response = await this.client.get(`/buckets/${projectId}/vaults/${vaultId}/documents.json`);
    return response.data;
  }

  async getDocument(projectId: string, documentId: string): Promise<Document> {
    const response = await this.client.get(`/buckets/${projectId}/documents/${documentId}.json`);
    return response.data;
  }

  async createDocument(
    projectId: string,
    vaultId: string,
    title: string,
    content: string,
    status = 'active'
  ): Promise<Document> {
    const response = await this.client.post(`/buckets/${projectId}/vaults/${vaultId}/documents.json`, {
      title,
      content,
      status,
    });
    return response.data;
  }

  async updateDocument(
    projectId: string,
    documentId: string,
    title?: string,
    content?: string
  ): Promise<Document> {
    const data: any = {};
    if (title) data.title = title;
    if (content) data.content = content;

    const response = await this.client.put(`/buckets/${projectId}/documents/${documentId}.json`, data);
    return response.data;
  }

  async trashDocument(projectId: string, documentId: string): Promise<void> {
    await this.client.delete(`/buckets/${projectId}/documents/${documentId}.json`);
  }

  // File methods
  async getUploads(projectId: string, vaultId?: string): Promise<Upload[]> {
    const endpoint = vaultId 
      ? `/buckets/${projectId}/vaults/${vaultId}/uploads.json`
      : `/buckets/${projectId}/uploads.json`;
    const response = await this.client.get(endpoint);
    return response.data;
  }

  async getUpload(projectId: string, uploadId: string): Promise<Upload> {
    const response = await this.client.get(`/buckets/${projectId}/uploads/${uploadId}.json`);
    return response.data;
  }

  async createAttachment(filePath: string, name: string, contentType = 'application/octet-stream'): Promise<any> {
    // Note: This would need actual file handling in a real implementation
    // For now, returning a placeholder
    throw new Error('File upload not implemented in TypeScript version yet');
  }

  // Webhook methods
  async getWebhooks(projectId: string): Promise<Webhook[]> {
    const response = await this.client.get(`/buckets/${projectId}/webhooks.json`);
    return response.data;
  }

  async createWebhook(projectId: string, payloadUrl: string, types?: string[]): Promise<Webhook> {
    const data: any = { payload_url: payloadUrl };
    if (types) data.types = types;

    const response = await this.client.post(`/buckets/${projectId}/webhooks.json`, data);
    return response.data;
  }

  async deleteWebhook(projectId: string, webhookId: string): Promise<void> {
    await this.client.delete(`/buckets/${projectId}/webhooks/${webhookId}.json`);
  }

  // Check-in methods
  async getDailyCheckIns(projectId: string, page = 1): Promise<DailyCheckIn[]> {
    const project = await this.getProject(projectId);
    const questionnaire = project.dock.find(item => item.name === 'questionnaire');
    
    if (!questionnaire) {
      throw new Error(`No questionnaire found for project ${projectId}`);
    }

    const response = await this.client.get(
      `/buckets/${projectId}/questionnaires/${questionnaire.id}/questions.json`,
      { params: { page } }
    );
    return response.data;
  }

  async getQuestionAnswers(projectId: string, questionId: string, page = 1): Promise<QuestionAnswer[]> {
    const response = await this.client.get(
      `/buckets/${projectId}/questions/${questionId}/answers.json`,
      { params: { page } }
    );
    return response.data;
  }

  // Utility methods
  async getEvents(projectId: string, recordingId: string): Promise<any[]> {
    const response = await this.client.get(`/buckets/${projectId}/recordings/${recordingId}/events.json`);
    return response.data;
  }
}
