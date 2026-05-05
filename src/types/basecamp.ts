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
  url?: string;
  app_url?: string;
  bookmarked?: boolean;
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
  status?: string;
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
  status?: string;
  content_type?: string;
  starts_on?: string;
  notify?: boolean;
  completion_subscriber_ids?: Array<number | string>;
  assignee_ids?: Array<number | string>;
  parent?: { id: string | number; title: string };
  bucket?: { id: string | number; name: string };
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
  status?: string;
  category_id?: number | string;
  subscriptions?: Array<number | string>;
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

export interface Schedule {
  id: string;
  title: string;
  entries_count?: number;
  status?: string;
}

export interface ScheduleEntry {
  id: string;
  summary: string;
  description?: string;
  starts_at: string;
  ends_at: string;
  all_day?: boolean;
  notify?: boolean;
  participant_ids?: Array<number | string>;
  status?: string;
  created_at: string;
  updated_at: string;
  creator?: Person;
  bucket?: { id: string | number; name: string };
  parent?: { id: string | number; title: string };
}

export interface MessageBoard {
  id: string;
  title: string;
  status?: string;
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

export type AssignmentScope =
  | 'overdue'
  | 'due_today'
  | 'due_tomorrow'
  | 'due_later_this_week'
  | 'due_next_week'
  | 'due_later';

export interface Assignment {
  id: string | number;
  app_url?: string;
  content: string;
  starts_on?: string | null;
  due_on?: string | null;
  bucket: { id: string | number; name: string; app_url?: string };
  completed: boolean;
  type: string;
  assignees: Array<{ id: string | number; name: string }>;
  comments_count?: number;
  has_description?: boolean;
  priority_recording_id?: string | number;
  parent?: { id: string | number; title: string; app_url?: string };
  children?: Assignment[];
}

export interface MyAssignmentsResponse {
  priorities: Assignment[];
  non_priorities: Assignment[];
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

// -------------------------------------------------------------------
// Wire-body types for PUT/POST requests.
// Distinct from the full resource types (which carry server-set fields
// like id, created_at, creator, bucket). The update-merge helper uses
// these as the TBody parameter so the compiler can verify that
// whitelist names exist on both the body and the resource.
// -------------------------------------------------------------------

export interface TodoCreateBody {
  content: string;
  description?: string;
  assignee_ids?: Array<number | string>;
  completion_subscriber_ids?: Array<number | string>;
  due_on?: string;
  starts_on?: string;
  notify?: boolean;
}

export interface TodoUpdateBody {
  content?: string;
  description?: string;
  assignee_ids?: Array<number | string>;
  completion_subscriber_ids?: Array<number | string>;
  due_on?: string;
  starts_on?: string;
  notify?: boolean;
}

export interface TodolistCreateBody {
  name: string;
  description?: string;
}

export interface TodolistUpdateBody {
  name?: string;
  description?: string;
}

export interface CommentCreateBody {
  content: string;
}

export interface CommentUpdateBody {
  content?: string;
}

export interface MessageCreateBody {
  subject: string;
  status: 'active';
  content?: string;
  category_id?: number | string;
  subscriptions?: Array<number | string>;
}

// Public input shape for create_message — same as MessageCreateBody minus
// the always-'active' status (which the resource layer adds). Lives here
// so it follows the convention that all wire/input types are in this file.
export interface CreateMessageInput {
  subject: string;
  content?: string;
  category_id?: number | string;
  subscriptions?: Array<number | string>;
}

export interface MessageUpdateBody {
  subject?: string;
  content?: string;
  category_id?: number | string;
}

export interface ScheduleEntryCreateBody {
  summary: string;
  starts_at: string;
  ends_at: string;
  description?: string;
  participant_ids?: Array<number | string>;
  all_day?: boolean;
  notify?: boolean;
}

export interface ScheduleEntryUpdateBody {
  summary?: string;
  description?: string;
  starts_at?: string;
  ends_at?: string;
  participant_ids?: Array<number | string>;
  all_day?: boolean;
  notify?: boolean;
}

export type RecordingStatus = 'active' | 'archived' | 'trashed';
