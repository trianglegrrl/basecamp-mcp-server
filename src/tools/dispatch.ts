import type { BasecampClient } from '../lib/basecamp-client.js';
import { successResult, errorResult, type MCPToolResultEnvelope } from './result.js';

export async function dispatch(
  name: string,
  args: Record<string, any>,
  client: BasecampClient,
): Promise<MCPToolResultEnvelope> {
  try {
    switch (name) {
      case 'get_projects': {
        const projects = await client.getProjects();
        return successResult({ projects, count: projects.length });
      }

      case 'get_project': {
        const project = await client.getProject(args.project_id);
        return successResult({ project });
      }

      case 'get_todolists': {
        const todolists = await client.getTodoLists(args.project_id);
        return successResult({ todolists, count: todolists.length });
      }

      case 'get_todos': {
        const todos = await client.getTodos(args.project_id, args.todolist_id);
        return successResult({ todos, count: todos.length });
      }

      case 'get_my_profile': {
        const profile = await client.getMyProfile();
        return successResult({ profile });
      }

      case 'get_my_assignments': {
        const assignments = await client.getMyAssignments();
        return successResult({
          priorities: assignments.priorities,
          non_priorities: assignments.non_priorities,
          count: (assignments.priorities?.length ?? 0) + (assignments.non_priorities?.length ?? 0),
        });
      }

      case 'get_my_due_assignments': {
        const assignments = await client.getMyDueAssignments(args.scope);
        return successResult({
          scope: args.scope ?? 'overdue',
          assignments,
          count: assignments.length,
        });
      }

      case 'get_my_completed_assignments': {
        const assignments = await client.getMyCompletedAssignments();
        return successResult({ assignments, count: assignments.length });
      }

      case 'get_people': {
        const people = await client.getPeople();
        return successResult({ people, count: people.length });
      }

      case 'get_project_people': {
        const people = await client.getProjectPeople(args.project_id);
        return successResult({ people, count: people.length });
      }

      case 'get_assignments_for_person': {
        const assignments = await client.findAssignmentsForPerson({
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

      case 'get_card_table': {
        const cardTable = await client.getCardTable(args.project_id);
        const cardTableDetails = await client.getCardTableDetails(args.project_id, cardTable.id);
        return successResult({ card_table: cardTableDetails });
      }

      case 'get_columns': {
        const columns = await client.getColumns(args.project_id, args.card_table_id);
        return successResult({ columns, count: columns.length });
      }

      case 'get_cards': {
        const cards = await client.getCards(args.project_id, args.column_id);
        return successResult({ cards, count: cards.length });
      }

      case 'create_card': {
        const card = await client.createCard(
          args.project_id,
          args.column_id,
          args.title,
          args.content,
          args.due_on,
          args.notify || false,
        );
        return successResult({ card, message: `Card '${args.title}' created successfully` });
      }

      case 'create_column': {
        const column = await client.createColumn(args.project_id, args.card_table_id, args.title);
        return successResult({ column, message: `Column '${args.title}' created successfully` });
      }

      case 'move_card': {
        await client.moveCard(args.project_id, args.card_id, args.column_id);
        return successResult({ message: `Card moved to column ${args.column_id}` });
      }

      case 'complete_card': {
        await client.completeCard(args.project_id, args.card_id);
        return successResult({ message: 'Card marked as complete' });
      }

      case 'get_card_steps': {
        const steps = await client.getCardSteps(args.project_id, args.card_id);
        return successResult({ steps, count: steps.length });
      }

      case 'create_card_step': {
        const step = await client.createCardStep(
          args.project_id,
          args.card_id,
          args.title,
          args.due_on,
          args.assignee_ids,
        );
        return successResult({ step, message: `Step '${args.title}' created successfully` });
      }

      case 'complete_card_step': {
        await client.completeCardStep(args.project_id, args.step_id);
        return successResult({ message: 'Step marked as complete' });
      }

      case 'get_campfire_lines': {
        const lines = await client.getCampfireLines(args.project_id, args.campfire_id);
        return successResult({ campfire_lines: lines, count: lines.length });
      }

      case 'get_comments': {
        const comments = await client.getComments(args.project_id, args.recording_id);
        return successResult({ comments, count: comments.length });
      }

      case 'get_documents': {
        const documents = await client.getDocuments(args.project_id, args.vault_id);
        return successResult({ documents, count: documents.length });
      }

      case 'create_document': {
        const document = await client.createDocument(
          args.project_id,
          args.vault_id,
          args.title,
          args.content,
        );
        return successResult({ document });
      }

      case 'get_daily_check_ins': {
        const checkIns = await client.getDailyCheckIns(args.project_id, args.page || 1);
        return successResult({ daily_check_ins: checkIns, count: checkIns.length });
      }

      default:
        return errorResult(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    if (error.response?.status === 401 && error.response?.data?.error?.includes('expired')) {
      return errorResult('Your Basecamp OAuth token has expired. Please re-authenticate: npm run auth', {
        error: 'OAuth token expired',
      });
    }
    return errorResult(error.message ?? 'Unknown error', { error: 'Execution error' });
  }
}
