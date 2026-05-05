import { z } from 'zod';
import type { BasecampClient } from '../../lib/basecamp-client.js';
import type { MCPToolResultEnvelope } from '../result.js';
import { successResult } from '../result.js';

const NoArgs = z.object({}).passthrough();
const ProjectIdArgs = z.object({ project_id: z.string() });

const ScopeEnum = z.enum([
  'overdue', 'due_today', 'due_tomorrow',
  'due_later_this_week', 'due_next_week', 'due_later',
]);

const GetTodosArgs = z.object({ project_id: z.string(), todolist_id: z.string() });
const GetMyDueArgs = z.object({ scope: ScopeEnum.optional() });

const GetAssignmentsForPersonArgs = z.object({
  person_id: z.union([z.string(), z.number()]).optional(),
  person_name: z.string().optional(),
  scope: ScopeEnum.optional(),
  bucket: z.string().optional(),
});

const GetCampfireLinesArgs = z.object({ project_id: z.string(), campfire_id: z.string() });
const GetCommentsArgs = z.object({ project_id: z.string(), recording_id: z.string() });
const GetDailyCheckInsArgs = z.object({ project_id: z.string(), page: z.number().optional() });
const GetQuestionAnswersArgs = z.object({
  project_id: z.string(),
  question_id: z.string(),
  page: z.number().optional(),
});

async function getProjects(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  NoArgs.parse(rawArgs);
  const projects = await c.getProjects();
  return successResult({ projects, count: projects.length });
}

async function getProject(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectIdArgs.parse(rawArgs);
  const project = await c.getProject(args.project_id);
  return successResult({ project });
}

async function getTodolists(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectIdArgs.parse(rawArgs);
  const todolists = await c.getTodoLists(args.project_id);
  return successResult({ todolists, count: todolists.length });
}

async function getTodos(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = GetTodosArgs.parse(rawArgs);
  const todos = await c.getTodos(args.project_id, args.todolist_id);
  return successResult({ todos, count: todos.length });
}

async function getMyProfile(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  NoArgs.parse(rawArgs);
  const profile = await c.getMyProfile();
  return successResult({ profile });
}

async function getMyAssignments(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  NoArgs.parse(rawArgs);
  const assignments = await c.getMyAssignments();
  return successResult({
    priorities: assignments.priorities,
    non_priorities: assignments.non_priorities,
    count: (assignments.priorities?.length ?? 0) + (assignments.non_priorities?.length ?? 0),
  });
}

async function getMyDueAssignments(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = GetMyDueArgs.parse(rawArgs);
  const assignments = await c.getMyDueAssignments(args.scope);
  return successResult({
    scope: args.scope ?? 'overdue',
    assignments,
    count: assignments.length,
  });
}

async function getMyCompletedAssignments(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  NoArgs.parse(rawArgs);
  const assignments = await c.getMyCompletedAssignments();
  return successResult({ assignments, count: assignments.length });
}

async function getPeople(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  NoArgs.parse(rawArgs);
  const people = await c.getPeople();
  return successResult({ people, count: people.length });
}

async function getProjectPeople(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectIdArgs.parse(rawArgs);
  const people = await c.getProjectPeople(args.project_id);
  return successResult({ people, count: people.length });
}

async function getAssignmentsForPerson(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = GetAssignmentsForPersonArgs.parse(rawArgs);
  const assignments = await c.findAssignmentsForPerson({
    personId: args.person_id,
    personName: args.person_name,
    scope: args.scope,
    bucket: args.bucket,
  });
  return successResult({
    scope: args.scope ?? null,
    person_id: args.person_id ?? null,
    person_name: args.person_name ?? null,
    assignments,
    count: assignments.length,
  });
}

async function getCampfireLines(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = GetCampfireLinesArgs.parse(rawArgs);
  const lines = await c.getCampfireLines(args.project_id, args.campfire_id);
  return successResult({ campfire_lines: lines, count: lines.length });
}

async function getComments(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = GetCommentsArgs.parse(rawArgs);
  const comments = await c.getComments(args.project_id, args.recording_id);
  return successResult({ comments, count: comments.length });
}

async function getDailyCheckIns(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = GetDailyCheckInsArgs.parse(rawArgs);
  const daily_check_ins = await c.getDailyCheckIns(args.project_id, args.page ?? 1);
  return successResult({ daily_check_ins, count: daily_check_ins.length });
}

async function getQuestionAnswers(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = GetQuestionAnswersArgs.parse(rawArgs);
  const answers = await c.getQuestionAnswers(args.project_id, args.question_id, args.page ?? 1);
  return successResult({ answers, count: answers.length });
}

export const handlers = {
  get_projects: getProjects,
  get_project: getProject,
  get_todolists: getTodolists,
  get_todos: getTodos,
  get_my_profile: getMyProfile,
  get_my_assignments: getMyAssignments,
  get_my_due_assignments: getMyDueAssignments,
  get_my_completed_assignments: getMyCompletedAssignments,
  get_people: getPeople,
  get_project_people: getProjectPeople,
  get_assignments_for_person: getAssignmentsForPerson,
  get_campfire_lines: getCampfireLines,
  get_comments: getComments,
  get_daily_check_ins: getDailyCheckIns,
  get_question_answers: getQuestionAnswers,
} as const;
