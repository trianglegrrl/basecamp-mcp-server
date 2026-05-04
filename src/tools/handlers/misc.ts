import type { BasecampClient } from '../../lib/basecamp-client.js';
import type { MCPToolResultEnvelope } from '../result.js';
import { successResult } from '../result.js';

async function getProjects(_args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const projects = await c.getProjects();
  return successResult({ projects, count: projects.length });
}

async function getProject(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const project = await c.getProject(args.project_id);
  return successResult({ project });
}

async function getTodolists(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const todolists = await c.getTodoLists(args.project_id);
  return successResult({ todolists, count: todolists.length });
}

async function getTodos(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const todos = await c.getTodos(args.project_id, args.todolist_id);
  return successResult({ todos, count: todos.length });
}

async function getMyProfile(_args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const profile = await c.getMyProfile();
  return successResult({ profile });
}

async function getMyAssignments(_args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const assignments = await c.getMyAssignments();
  return successResult({
    priorities: assignments.priorities,
    non_priorities: assignments.non_priorities,
    count: (assignments.priorities?.length ?? 0) + (assignments.non_priorities?.length ?? 0),
  });
}

async function getMyDueAssignments(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const assignments = await c.getMyDueAssignments(args.scope);
  return successResult({
    scope: args.scope ?? 'overdue',
    assignments,
    count: assignments.length,
  });
}

async function getMyCompletedAssignments(_args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const assignments = await c.getMyCompletedAssignments();
  return successResult({ assignments, count: assignments.length });
}

async function getPeople(_args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const people = await c.getPeople();
  return successResult({ people, count: people.length });
}

async function getProjectPeople(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const people = await c.getProjectPeople(args.project_id);
  return successResult({ people, count: people.length });
}

async function getAssignmentsForPerson(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
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

async function getCampfireLines(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const lines = await c.getCampfireLines(args.project_id, args.campfire_id);
  return successResult({ campfire_lines: lines, count: lines.length });
}

async function getComments(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const comments = await c.getComments(args.project_id, args.recording_id);
  return successResult({ comments, count: comments.length });
}

async function getDailyCheckIns(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const daily_check_ins = await c.getDailyCheckIns(args.project_id, args.page ?? 1);
  return successResult({ daily_check_ins, count: daily_check_ins.length });
}

async function getQuestionAnswers(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
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
