export interface BasecampConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  accountId: string;
  userAgent: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  accountId: string;
  expiresAt?: string;
  updatedAt: string;
}

export interface BasecampProject {
  id: string;
  name: string;
  description?: string;
  dock: DockItem[];
  created_at: string;
  updated_at: string;
  status: string;
}

export interface DockItem {
  id: string;
  name: string;
  enabled: boolean;
  position?: number;
  url?: string;
  app_url?: string;
}

export interface TodoList {
  id: string;
  name: string;
  description?: string;
  completed: boolean;
  completed_ratio: string;
  created_at: string;
  updated_at: string;
  project?: ProjectInfo;
}

export interface Todo {
  id: string;
  content: string;
  description?: string;
  completed: boolean;
  due_on?: string;
  created_at: string;
  updated_at: string;
  assignees?: Person[];
  creator: Person;
  project?: ProjectInfo;
  todolist?: { id: string; name: string; };
}

export interface Person {
  id: string;
  name: string;
  email_address?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
}

export interface ProjectInfo {
  id: string;
  name: string;
}

export interface CardTable {
  id: string;
  title: string;
  lists: Column[];
  status?: string;
}

export interface Column {
  id: string;
  title: string;
  position: number;
  color?: string;
  cards_count?: number;
  on_hold?: boolean;
}

export interface Card {
  id: string;
  title: string;
  content?: string;
  due_on?: string;
  position: number;
  completed: boolean;
  created_at: string;
  updated_at: string;
  assignees?: Person[];
  creator: Person;
  steps?: CardStep[];
}

export interface CardStep {
  id: string;
  title: string;
  completed: boolean;
  due_on?: string;
  position: number;
  assignees?: Person[];
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  subject: string;
  content: string;
  created_at: string;
  updated_at: string;
  creator: Person;
  project?: ProjectInfo;
  category?: { id: string; name: string; };
}

export interface CampfireLine {
  id: string;
  content: string;
  created_at: string;
  creator: Person;
  project?: ProjectInfo;
  campfire?: { id: string; title: string; };
}

export interface Comment {
  id: string;
  content: string;
  created_at: string;
  updated_at: string;
  creator: Person;
}

export interface Document {
  id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
  updated_at: string;
  creator: Person;
}

export interface Upload {
  id: string;
  filename: string;
  title?: string;
  description?: string;
  byte_size: number;
  content_type: string;
  created_at: string;
  creator: Person;
  download_url: string;
  project?: ProjectInfo;
}

export interface Webhook {
  id: string;
  payload_url: string;
  types: string[];
  created_at: string;
  updated_at: string;
}

export interface DailyCheckIn {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  creator: Person;
}

export interface QuestionAnswer {
  id: string;
  content: string;
  created_at: string;
  creator: Person;
}

export interface SearchResults {
  projects?: BasecampProject[];
  todos?: Todo[];
  messages?: Message[];
  campfire_lines?: CampfireLine[];
  uploads?: Upload[];
}

export interface APIResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  error?: string;
  message?: string;
}

export interface MCPToolResult {
  status: 'success' | 'error';
  [key: string]: any;
}

export type AuthMode = 'basic' | 'oauth';
