import { describe, it, expect, vi } from 'vitest';
import { handlers } from '../../../tools/handlers/misc.js';
import type { BasecampClient } from '../../../lib/basecamp-client.js';

function makeMockClient(overrides: Partial<BasecampClient> = {}): BasecampClient {
  return {
    getProjects: vi.fn(),
    getProject: vi.fn(),
    getTodoLists: vi.fn(),
    getTodos: vi.fn(),
    getMyProfile: vi.fn(),
    getMyAssignments: vi.fn(),
    getMyDueAssignments: vi.fn(),
    getMyCompletedAssignments: vi.fn(),
    getPeople: vi.fn(),
    getProjectPeople: vi.fn(),
    findAssignmentsForPerson: vi.fn(),
    getCampfireLines: vi.fn(),
    getComments: vi.fn(),
    getDailyCheckIns: vi.fn(),
    getQuestionAnswers: vi.fn(),
    ...overrides,
  } as unknown as BasecampClient;
}

describe('misc handlers', () => {
  it('get_projects: no args, returns array + count', async () => {
    const client = makeMockClient();
    (client.getProjects as any).mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const result = await handlers.get_projects({}, client);
    expect(client.getProjects).toHaveBeenCalledWith();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.projects).toHaveLength(2);
    expect(parsed.count).toBe(2);
  });

  it('get_project: forwards project_id', async () => {
    const client = makeMockClient();
    (client.getProject as any).mockResolvedValue({ id: '100' });
    const result = await handlers.get_project({ project_id: '100' }, client);
    expect(client.getProject).toHaveBeenCalledWith('100');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.project.id).toBe('100');
  });

  it('get_todolists: forwards project_id', async () => {
    const client = makeMockClient();
    (client.getTodoLists as any).mockResolvedValue([{ id: 't1' }]);
    const result = await handlers.get_todolists({ project_id: '100' }, client);
    expect(client.getTodoLists).toHaveBeenCalledWith('100');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.todolists).toHaveLength(1);
    expect(parsed.count).toBe(1);
  });

  it('get_todos: forwards (project_id, todolist_id)', async () => {
    const client = makeMockClient();
    (client.getTodos as any).mockResolvedValue([{ id: 'a' }]);
    const result = await handlers.get_todos({ project_id: '100', todolist_id: 't1' }, client);
    expect(client.getTodos).toHaveBeenCalledWith('100', 't1');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.todos).toHaveLength(1);
    expect(parsed.count).toBe(1);
  });

  it('get_my_profile: returns profile', async () => {
    const client = makeMockClient();
    (client.getMyProfile as any).mockResolvedValue({ id: 'me', name: 'Me' });
    const result = await handlers.get_my_profile({}, client);
    expect(client.getMyProfile).toHaveBeenCalledWith();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.profile.name).toBe('Me');
  });

  it('get_my_assignments: returns priorities + non_priorities + count', async () => {
    const client = makeMockClient();
    (client.getMyAssignments as any).mockResolvedValue({
      priorities: [{ id: '1' }],
      non_priorities: [{ id: '2' }, { id: '3' }],
    });
    const result = await handlers.get_my_assignments({}, client);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.priorities).toHaveLength(1);
    expect(parsed.non_priorities).toHaveLength(2);
    expect(parsed.count).toBe(3);
  });

  it('get_my_due_assignments: forwards scope; defaults to overdue when omitted', async () => {
    const client = makeMockClient();
    (client.getMyDueAssignments as any).mockResolvedValue([{ id: '1' }]);
    const result = await handlers.get_my_due_assignments({}, client);
    expect(client.getMyDueAssignments).toHaveBeenCalledWith(undefined);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.scope).toBe('overdue');
    expect(parsed.assignments).toHaveLength(1);
    expect(parsed.count).toBe(1);
  });

  it('get_my_due_assignments: passes scope when provided', async () => {
    const client = makeMockClient();
    (client.getMyDueAssignments as any).mockResolvedValue([]);
    const result = await handlers.get_my_due_assignments({ scope: 'due_today' }, client);
    expect(client.getMyDueAssignments).toHaveBeenCalledWith('due_today');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.scope).toBe('due_today');
  });

  it('get_my_completed_assignments: returns assignments + count', async () => {
    const client = makeMockClient();
    (client.getMyCompletedAssignments as any).mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const result = await handlers.get_my_completed_assignments({}, client);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.assignments).toHaveLength(2);
    expect(parsed.count).toBe(2);
  });

  it('get_people: returns people + count', async () => {
    const client = makeMockClient();
    (client.getPeople as any).mockResolvedValue([{ id: 'p1' }]);
    const result = await handlers.get_people({}, client);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.people).toHaveLength(1);
    expect(parsed.count).toBe(1);
  });

  it('get_project_people: forwards project_id', async () => {
    const client = makeMockClient();
    (client.getProjectPeople as any).mockResolvedValue([{ id: 'p1' }]);
    const result = await handlers.get_project_people({ project_id: '100' }, client);
    expect(client.getProjectPeople).toHaveBeenCalledWith('100');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.people).toHaveLength(1);
  });

  it('get_assignments_for_person: forwards { personId, personName, scope, bucket }', async () => {
    const client = makeMockClient();
    (client.findAssignmentsForPerson as any).mockResolvedValue([{ id: '1' }]);
    const result = await handlers.get_assignments_for_person(
      { person_id: 'p1', person_name: 'Jill', scope: 'due_today', bucket: '100' },
      client,
    );
    expect(client.findAssignmentsForPerson).toHaveBeenCalledWith({
      personId: 'p1',
      personName: 'Jill',
      scope: 'due_today',
      bucket: '100',
    });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.assignments).toHaveLength(1);
    expect(parsed.scope).toBe('due_today');
    expect(parsed.person_id).toBe('p1');
    expect(parsed.person_name).toBe('Jill');
  });

  it('get_assignments_for_person: passes nulls for omitted optional fields', async () => {
    const client = makeMockClient();
    (client.findAssignmentsForPerson as any).mockResolvedValue([]);
    const result = await handlers.get_assignments_for_person({}, client);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.scope).toBeNull();
    expect(parsed.person_id).toBeNull();
    expect(parsed.person_name).toBeNull();
  });

  it('get_campfire_lines: forwards (project_id, campfire_id)', async () => {
    const client = makeMockClient();
    (client.getCampfireLines as any).mockResolvedValue([{ id: 'l1' }]);
    const result = await handlers.get_campfire_lines({ project_id: '100', campfire_id: 'c1' }, client);
    expect(client.getCampfireLines).toHaveBeenCalledWith('100', 'c1');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.campfire_lines).toHaveLength(1);
    expect(parsed.count).toBe(1);
  });

  it('get_comments: forwards (project_id, recording_id)', async () => {
    const client = makeMockClient();
    (client.getComments as any).mockResolvedValue([{ id: 'co1' }]);
    const result = await handlers.get_comments({ project_id: '100', recording_id: 'r1' }, client);
    expect(client.getComments).toHaveBeenCalledWith('100', 'r1');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.comments).toHaveLength(1);
  });

  it('get_daily_check_ins: forwards page (defaults to 1 when omitted)', async () => {
    const client = makeMockClient();
    (client.getDailyCheckIns as any).mockResolvedValue([{ id: 'q1' }]);
    const result = await handlers.get_daily_check_ins({ project_id: '100' }, client);
    expect(client.getDailyCheckIns).toHaveBeenCalledWith('100', 1);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.daily_check_ins).toHaveLength(1);
  });

  it('get_daily_check_ins: passes explicit page', async () => {
    const client = makeMockClient();
    (client.getDailyCheckIns as any).mockResolvedValue([]);
    await handlers.get_daily_check_ins({ project_id: '100', page: 3 }, client);
    expect(client.getDailyCheckIns).toHaveBeenCalledWith('100', 3);
  });

  it('get_question_answers (wire-up fix): forwards (project_id, question_id, page)', async () => {
    const client = makeMockClient();
    (client.getQuestionAnswers as any).mockResolvedValue([{ id: 'a1' }]);
    const result = await handlers.get_question_answers(
      { project_id: '100', question_id: 'q1', page: 2 },
      client,
    );
    expect(client.getQuestionAnswers).toHaveBeenCalledWith('100', 'q1', 2);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.answers).toHaveLength(1);
    expect(parsed.count).toBe(1);
  });

  it('get_question_answers (wire-up fix): defaults page to 1 when omitted', async () => {
    const client = makeMockClient();
    (client.getQuestionAnswers as any).mockResolvedValue([]);
    await handlers.get_question_answers({ project_id: '100', question_id: 'q1' }, client);
    expect(client.getQuestionAnswers).toHaveBeenCalledWith('100', 'q1', 1);
  });
});
