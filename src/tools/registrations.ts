import type { Tool } from '@modelcontextprotocol/sdk/types.js';

export const tools: Tool[] = [
  // Core tools
  {
    name: 'get_projects',
    description: 'Get all Basecamp projects',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'get_project',
    description: 'Get details for a specific project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
      },
      required: ['project_id'],
    },
  },

  // Todo tools
  {
    name: 'get_todolists',
    description: 'Get todo lists for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_todos',
    description: 'Get todos from a todo list',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        todolist_id: { type: 'string', description: 'The todo list ID' },
      },
      required: ['project_id', 'todolist_id'],
    },
  },
  {
    name: 'get_my_profile',
    description: 'Get the current authenticated user\'s profile (id, name, email). Useful before filtering tasks "assigned to me".',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_my_assignments',
    description: 'Get the current user\'s active assignments (todos and card steps assigned to me) across all projects, grouped into priorities and non_priorities. Includes due_on and bucket (project) info.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_my_due_assignments',
    description: 'Get the current user\'s assignments filtered by due-date scope. Defaults to "overdue" when scope omitted.',
    inputSchema: {
      type: 'object',
      properties: {
        scope: {
          type: 'string',
          enum: ['overdue', 'due_today', 'due_tomorrow', 'due_later_this_week', 'due_next_week', 'due_later'],
          description: 'Due-date scope filter. Omit for server default (overdue).',
        },
      },
    },
  },
  {
    name: 'get_my_completed_assignments',
    description: 'Get the current user\'s completed assignments (excludes archived/trashed).',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_people',
    description: 'List all people visible to the current user across the account.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'get_project_people',
    description: 'List active people on a given project.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_assignments_for_person',
    description: 'Find todos assigned to ANY person (not just current user). Use to answer questions like "show me Jill\'s tasks due this week". Provide person_id OR person_name (case-insensitive substring match against /people.json). Optional scope filter (overdue, due_today, due_tomorrow, due_later_this_week, due_next_week, due_later) and bucket filter (project ID, comma-separated). Walks /projects/recordings.json?type=Todo and filters client-side; assignee filtering is not server-side in BC3.',
    inputSchema: {
      type: 'object',
      properties: {
        person_id: { type: ['string', 'number'], description: 'Basecamp person id (preferred when known)' },
        person_name: { type: 'string', description: 'Substring of person name (case-insensitive). Resolved via /people.json.' },
        scope: {
          type: 'string',
          enum: ['overdue', 'due_today', 'due_tomorrow', 'due_later_this_week', 'due_next_week', 'due_later'],
          description: 'Optional due-date scope filter. Scopes are disjoint.',
        },
        bucket: { type: 'string', description: 'Optional project ID, or comma-separated list, to scope the recordings query.' },
      },
    },
  },

  // Card Table tools
  {
    name: 'get_card_table',
    description: 'Get the card table details for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_columns',
    description: 'Get all columns in a card table',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        card_table_id: { type: 'string', description: 'The card table ID' },
      },
      required: ['project_id', 'card_table_id'],
    },
  },
  {
    name: 'get_cards',
    description: 'Get all cards in a column',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        column_id: { type: 'string', description: 'The column ID' },
      },
      required: ['project_id', 'column_id'],
    },
  },
  {
    name: 'create_card',
    description: 'Create a new card in a column',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        column_id: { type: 'string', description: 'The column ID' },
        title: { type: 'string', description: 'The card title' },
        content: { type: 'string', description: 'Optional card content/description' },
        due_on: { type: 'string', description: 'Optional due date (ISO 8601 format)' },
        notify: { type: 'boolean', description: 'Whether to notify assignees (default: false)' },
      },
      required: ['project_id', 'column_id', 'title'],
    },
  },

  // Column Management tools
  {
    name: 'create_column',
    description: 'Create a new column in a card table',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        card_table_id: { type: 'string', description: 'The card table ID' },
        title: { type: 'string', description: 'The column title' },
      },
      required: ['project_id', 'card_table_id', 'title'],
    },
  },
  {
    name: 'update_column',
    description: 'Update a column title',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        column_id: { type: 'string', description: 'The column ID' },
        title: { type: 'string', description: 'The new column title' },
      },
      required: ['project_id', 'column_id', 'title'],
    },
  },
  {
    name: 'move_column',
    description: 'Move a column to a new position',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        card_table_id: { type: 'string', description: 'The card table ID' },
        column_id: { type: 'string', description: 'The column ID' },
        position: { type: 'number', description: 'The new 1-based position' },
      },
      required: ['project_id', 'card_table_id', 'column_id', 'position'],
    },
  },
  {
    name: 'update_column_color',
    description: 'Update a column color',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        column_id: { type: 'string', description: 'The column ID' },
        color: { type: 'string', description: 'The hex color code (e.g., #FF0000)' },
      },
      required: ['project_id', 'column_id', 'color'],
    },
  },

  // Card Management tools
  {
    name: 'get_card',
    description: 'Get details for a specific card',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        card_id: { type: 'string', description: 'The card ID' },
      },
      required: ['project_id', 'card_id'],
    },
  },
  {
    name: 'update_card',
    description: 'Update a card',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        card_id: { type: 'string', description: 'The card ID' },
        title: { type: 'string', description: 'The new card title' },
        content: { type: 'string', description: 'The new card content/description' },
        due_on: { type: 'string', description: 'Due date (ISO 8601 format)' },
        assignee_ids: { type: 'array', items: { type: ['string', 'number'] }, description: 'Array of person IDs to assign to the card. BC3 expects numeric person IDs (e.g., from get_people / get_project_people). Sending strings causes BC3 to silently drop them — the assignment never sticks.' },
      },
      required: ['project_id', 'card_id'],
    },
  },
  {
    name: 'move_card',
    description: 'Move a card to a new column',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        card_id: { type: 'string', description: 'The card ID' },
        column_id: { type: 'string', description: 'The destination column ID' },
      },
      required: ['project_id', 'card_id', 'column_id'],
    },
  },
  {
    name: 'complete_card',
    description: 'Mark a card as complete',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        card_id: { type: 'string', description: 'The card ID' },
      },
      required: ['project_id', 'card_id'],
    },
  },

  // Card Steps tools
  {
    name: 'get_card_steps',
    description: 'Get all steps (sub-tasks) for a card',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        card_id: { type: 'string', description: 'The card ID' },
      },
      required: ['project_id', 'card_id'],
    },
  },
  {
    name: 'create_card_step',
    description: 'Create a new step (sub-task) for a card',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        card_id: { type: 'string', description: 'The card ID' },
        title: { type: 'string', description: 'The step title' },
        due_on: { type: 'string', description: 'Optional due date (ISO 8601 format)' },
        assignee_ids: { type: 'array', items: { type: ['string', 'number'] }, description: 'Array of person IDs to assign to the step. BC3 expects numeric person IDs (e.g., from get_people / get_project_people). Sending strings causes BC3 to silently drop them — the assignment never sticks.' },
      },
      required: ['project_id', 'card_id', 'title'],
    },
  },
  {
    name: 'complete_card_step',
    description: 'Mark a card step as complete',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        step_id: { type: 'string', description: 'The step ID' },
      },
      required: ['project_id', 'step_id'],
    },
  },

  // Communication tools
  {
    name: 'get_campfire_lines',
    description: 'Get recent messages from a Basecamp campfire (chat room)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        campfire_id: { type: 'string', description: 'The campfire/chat room ID' },
      },
      required: ['project_id', 'campfire_id'],
    },
  },
  {
    name: 'get_comments',
    description: 'Get comments for a Basecamp item',
    inputSchema: {
      type: 'object',
      properties: {
        recording_id: { type: 'string', description: 'The item ID' },
        project_id: { type: 'string', description: 'The project ID' },
      },
      required: ['recording_id', 'project_id'],
    },
  },

  // Document tools
  {
    name: 'get_documents',
    description: 'List documents in a vault',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        vault_id: { type: 'string', description: 'Vault ID' },
      },
      required: ['project_id', 'vault_id'],
    },
  },
  {
    name: 'create_document',
    description: 'Create a document in a vault',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        vault_id: { type: 'string', description: 'Vault ID' },
        title: { type: 'string', description: 'Document title' },
        content: { type: 'string', description: 'Document HTML content' },
      },
      required: ['project_id', 'vault_id', 'title', 'content'],
    },
  },
  {
    name: 'update_document',
    description: 'Update a document',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        document_id: { type: 'string', description: 'Document ID' },
        title: { type: 'string', description: 'New title' },
        content: { type: 'string', description: 'New HTML content' },
      },
      required: ['project_id', 'document_id'],
    },
  },
  {
    name: 'trash_document',
    description: 'Move a document to trash',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        document_id: { type: 'string', description: 'Document ID' },
      },
      required: ['project_id', 'document_id'],
    },
  },

  // File tools
  {
    name: 'get_uploads',
    description: 'List uploads in a project or vault',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        vault_id: { type: 'string', description: 'Optional vault ID to limit to specific vault' },
      },
      required: ['project_id'],
    },
  },

  // Webhook tools
  {
    name: 'get_webhooks',
    description: 'List webhooks for a project',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'create_webhook',
    description: 'Create a webhook',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        payload_url: { type: 'string', description: 'Payload URL' },
        types: { type: 'array', items: { type: 'string' }, description: 'Event types' },
      },
      required: ['project_id', 'payload_url'],
    },
  },
  {
    name: 'delete_webhook',
    description: 'Delete a webhook',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'Project ID' },
        webhook_id: { type: 'string', description: 'Webhook ID' },
      },
      required: ['project_id', 'webhook_id'],
    },
  },

  // Check-in tools
  {
    name: 'get_daily_check_ins',
    description: "Get project's daily checking questionnaire",
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        page: { type: 'number', description: 'Page number for paginated response' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_question_answers',
    description: 'Get answers on daily check-in question',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        question_id: { type: 'string', description: 'The question ID' },
        page: { type: 'number', description: 'Page number for paginated response' },
      },
      required: ['project_id', 'question_id'],
    },
  },

  // Todo write tools
  {
    name: 'get_todo',
    description: 'Get a single todo by ID',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        todo_id: { type: 'string', description: 'The todo ID' },
      },
      required: ['project_id', 'todo_id'],
    },
  },
  {
    name: 'create_todo',
    description: 'Create a new todo in a todo list',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        todolist_id: { type: 'string', description: 'The todo list ID' },
        content: { type: 'string', description: 'The todo content/title (required)' },
        description: { type: 'string', description: 'Optional rich-text description (HTML)' },
        assignee_ids: { type: 'array', items: { type: ['string', 'number'] }, description: 'Optional array of person IDs to assign' },
        completion_subscriber_ids: { type: 'array', items: { type: ['string', 'number'] }, description: 'Optional array of person IDs to notify on completion' },
        due_on: { type: 'string', description: 'Optional due date (YYYY-MM-DD)' },
        starts_on: { type: 'string', description: 'Optional start date (YYYY-MM-DD)' },
        notify: { type: 'boolean', description: 'Whether to notify assignees (default false)' },
      },
      required: ['project_id', 'todolist_id', 'content'],
    },
  },
  {
    name: 'update_todo',
    description: 'Update fields on an existing todo. Only the supplied fields change; omitted fields are preserved (fetch-then-merge).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        todo_id: { type: 'string', description: 'The todo ID' },
        content: { type: 'string', description: 'New content/title' },
        description: { type: 'string', description: 'New rich-text description (HTML)' },
        assignee_ids: { type: 'array', items: { type: ['string', 'number'] } },
        completion_subscriber_ids: { type: 'array', items: { type: ['string', 'number'] } },
        due_on: { type: 'string', description: 'New due date (YYYY-MM-DD)' },
        starts_on: { type: 'string', description: 'New start date (YYYY-MM-DD)' },
        notify: { type: 'boolean' },
      },
      required: ['project_id', 'todo_id'],
    },
  },
  {
    name: 'complete_todo',
    description: 'Mark a todo as complete',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        todo_id: { type: 'string', description: 'The todo ID' },
      },
      required: ['project_id', 'todo_id'],
    },
  },
  {
    name: 'uncomplete_todo',
    description: 'Mark a previously-completed todo as incomplete',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        todo_id: { type: 'string', description: 'The todo ID' },
      },
      required: ['project_id', 'todo_id'],
    },
  },
  {
    name: 'reposition_todo',
    description: 'Move a todo to a new position; optionally move into a different todo list via parent_id',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        todo_id: { type: 'string', description: 'The todo ID' },
        position: { type: 'number', description: 'New 1-based position' },
        parent_id: { type: 'string', description: 'Optional: ID of a todo list to move this todo into' },
      },
      required: ['project_id', 'todo_id', 'position'],
    },
  },

  // Todo list write tools
  {
    name: 'get_todolist',
    description: 'Get a single todo list by ID',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        todolist_id: { type: 'string', description: 'The todo list ID' },
      },
      required: ['project_id', 'todolist_id'],
    },
  },
  {
    name: 'create_todolist',
    description: 'Create a new todo list under a project\'s todo set',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        todoset_id: { type: 'string', description: 'The todo set ID (the project\'s todo set, see project.dock for entry name=todoset)' },
        name: { type: 'string', description: 'The todo list name (required)' },
        description: { type: 'string', description: 'Optional rich-text description (HTML)' },
      },
      required: ['project_id', 'todoset_id', 'name'],
    },
  },
  {
    name: 'update_todolist',
    description: 'Update name or description of a todo list. Omitted fields are preserved (fetch-then-merge).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        todolist_id: { type: 'string', description: 'The todo list ID' },
        name: { type: 'string', description: 'New name' },
        description: { type: 'string', description: 'New rich-text description (HTML)' },
      },
      required: ['project_id', 'todolist_id'],
    },
  },

  // Comment write tools
  {
    name: 'get_comment',
    description: 'Get a single comment by ID',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        comment_id: { type: 'string', description: 'The comment ID' },
      },
      required: ['project_id', 'comment_id'],
    },
  },
  {
    name: 'create_comment',
    description: 'Post a comment on a Basecamp recording (todo, message, document, card, etc.)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        recording_id: { type: 'string', description: 'The recording (target item) ID — todo, message, document, card, etc.' },
        content: { type: 'string', description: 'Comment body — HTML allowed (see BC3 rich-text guide)' },
      },
      required: ['project_id', 'recording_id', 'content'],
    },
  },
  {
    name: 'update_comment',
    description: 'Update the content of an existing comment. Partial PUT — single field; no merge needed.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        comment_id: { type: 'string', description: 'The comment ID' },
        content: { type: 'string', description: 'New comment body (HTML)' },
      },
      required: ['project_id', 'comment_id'],
    },
  },

  // Recording-status tools (set_*_status)
  {
    name: 'set_todo_status',
    description: 'Set the status of a todo to active, archived, or trashed. Idempotent — safe to call repeatedly.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        todo_id:    { type: 'string', description: 'The todo ID' },
        status:     { type: 'string', enum: ['active', 'archived', 'trashed'], description: 'New status' },
      },
      required: ['project_id', 'todo_id', 'status'],
    },
  },
  {
    name: 'set_todolist_status',
    description: 'Set the status of a todo list to active, archived, or trashed. Idempotent.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id:   { type: 'string', description: 'The project ID' },
        todolist_id:  { type: 'string', description: 'The todo list ID' },
        status:       { type: 'string', enum: ['active', 'archived', 'trashed'], description: 'New status' },
      },
      required: ['project_id', 'todolist_id', 'status'],
    },
  },
  {
    name: 'set_message_status',
    description: 'Set the status of a message to active, archived, or trashed. Idempotent.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        message_id: { type: 'string', description: 'The message ID' },
        status:     { type: 'string', enum: ['active', 'archived', 'trashed'], description: 'New status' },
      },
      required: ['project_id', 'message_id', 'status'],
    },
  },
  {
    name: 'set_comment_status',
    description: 'Set the status of a comment to active, archived, or trashed. Idempotent.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        comment_id: { type: 'string', description: 'The comment ID' },
        status:     { type: 'string', enum: ['active', 'archived', 'trashed'], description: 'New status' },
      },
      required: ['project_id', 'comment_id', 'status'],
    },
  },
  {
    name: 'set_schedule_entry_status',
    description: 'Set the status of a schedule entry to active, archived, or trashed. Idempotent.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        entry_id:   { type: 'string', description: 'The schedule entry ID' },
        status:     { type: 'string', enum: ['active', 'archived', 'trashed'], description: 'New status' },
      },
      required: ['project_id', 'entry_id', 'status'],
    },
  },

  // Message write tools
  {
    name: 'get_message_board',
    description: 'Get the message board for a project (each project has exactly one)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_messages',
    description: 'List messages on a message board',
    inputSchema: {
      type: 'object',
      properties: {
        project_id:       { type: 'string', description: 'The project ID' },
        message_board_id: { type: 'string', description: 'The message board ID (see get_message_board)' },
      },
      required: ['project_id', 'message_board_id'],
    },
  },
  {
    name: 'get_message',
    description: 'Get a single message by ID',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        message_id: { type: 'string', description: 'The message ID' },
      },
      required: ['project_id', 'message_id'],
    },
  },
  {
    name: 'create_message',
    description: 'Post a new message to a message board. Always published immediately (no draft state exposed).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id:       { type: 'string', description: 'The project ID' },
        message_board_id: { type: 'string', description: 'The message board ID (see get_message_board)' },
        subject:          { type: 'string', description: 'Message title (required)' },
        content:          { type: 'string', description: 'Optional message body — HTML allowed' },
        category_id:      { type: ['string', 'number'], description: 'Optional message-type ID (see message_types endpoint)' },
        subscriptions:    { type: 'array', items: { type: ['string', 'number'] }, description: 'Optional array of person IDs to notify and subscribe; default = all project members' },
      },
      required: ['project_id', 'message_board_id', 'subject'],
    },
  },
  {
    name: 'update_message',
    description: 'Update fields on an existing message. Omitted fields are preserved (fetch-then-merge).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id:  { type: 'string', description: 'The project ID' },
        message_id:  { type: 'string', description: 'The message ID' },
        subject:     { type: 'string', description: 'New subject' },
        content:     { type: 'string', description: 'New body (HTML)' },
        category_id: { type: ['string', 'number'], description: 'New category ID' },
      },
      required: ['project_id', 'message_id'],
    },
  },

  // Schedule write tools
  {
    name: 'get_schedule',
    description: 'Get the schedule for a project (each project has exactly one)',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
      },
      required: ['project_id'],
    },
  },
  {
    name: 'get_schedule_entries',
    description: 'List schedule entries on a schedule',
    inputSchema: {
      type: 'object',
      properties: {
        project_id:  { type: 'string', description: 'The project ID' },
        schedule_id: { type: 'string', description: 'The schedule ID (see get_schedule)' },
      },
      required: ['project_id', 'schedule_id'],
    },
  },
  {
    name: 'get_schedule_entry',
    description: 'Get a single schedule entry by ID',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: { type: 'string', description: 'The project ID' },
        entry_id:   { type: 'string', description: 'The schedule entry ID' },
      },
      required: ['project_id', 'entry_id'],
    },
  },
  {
    name: 'create_schedule_entry',
    description: 'Create a new schedule entry on a schedule',
    inputSchema: {
      type: 'object',
      properties: {
        project_id:      { type: 'string', description: 'The project ID' },
        schedule_id:     { type: 'string', description: 'The schedule ID (see get_schedule)' },
        summary:         { type: 'string', description: 'Entry summary/title (required)' },
        starts_at:       { type: 'string', description: 'ISO 8601 start datetime (required) — for all-day events use YYYY-MM-DD' },
        ends_at:         { type: 'string', description: 'ISO 8601 end datetime (required) — for all-day events use YYYY-MM-DD' },
        description:     { type: 'string', description: 'Optional rich-text description (HTML)' },
        participant_ids: { type: 'array', items: { type: ['string', 'number'] }, description: 'Optional array of person IDs to invite' },
        all_day:         { type: 'boolean', description: 'Whether this is an all-day event' },
        notify:          { type: 'boolean', description: 'Whether to notify participants' },
      },
      required: ['project_id', 'schedule_id', 'summary', 'starts_at', 'ends_at'],
    },
  },
  {
    name: 'update_schedule_entry',
    description: 'Update fields on an existing schedule entry. Omitted fields are preserved (fetch-then-merge).',
    inputSchema: {
      type: 'object',
      properties: {
        project_id:      { type: 'string', description: 'The project ID' },
        entry_id:        { type: 'string', description: 'The schedule entry ID' },
        summary:         { type: 'string' },
        description:     { type: 'string' },
        starts_at:       { type: 'string' },
        ends_at:         { type: 'string' },
        participant_ids: { type: 'array', items: { type: ['string', 'number'] } },
        all_day:         { type: 'boolean' },
        notify:          { type: 'boolean' },
      },
      required: ['project_id', 'entry_id'],
    },
  },
];
