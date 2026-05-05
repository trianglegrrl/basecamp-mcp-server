import { z } from 'zod';
import type { BasecampClient } from '../../lib/basecamp-client.js';
import type { MCPToolResultEnvelope } from '../result.js';
import { successResult } from '../result.js';

const ProjectVaultArgs = z.object({ project_id: z.string(), vault_id: z.string() });

const CreateDocumentArgs = z.object({
  project_id: z.string(),
  vault_id: z.string(),
  title: z.string(),
  content: z.string(),
});

const UpdateDocumentArgs = z.object({
  project_id: z.string(),
  document_id: z.string(),
  title: z.string().optional(),
  content: z.string().optional(),
});

const ProjectDocumentArgs = z.object({ project_id: z.string(), document_id: z.string() });

const GetUploadsArgs = z.object({
  project_id: z.string(),
  vault_id: z.string().optional(),
});

async function getDocuments(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectVaultArgs.parse(rawArgs);
  const documents = await c.getDocuments(args.project_id, args.vault_id);
  return successResult({ documents, count: documents.length });
}

async function createDocument(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = CreateDocumentArgs.parse(rawArgs);
  const document = await c.createDocument(args.project_id, args.vault_id, args.title, args.content);
  return successResult({ document });
}

async function updateDocument(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = UpdateDocumentArgs.parse(rawArgs);
  const document = await c.updateDocument(args.project_id, args.document_id, args.title, args.content);
  return successResult({ document, message: 'Document updated' });
}

async function trashDocument(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = ProjectDocumentArgs.parse(rawArgs);
  await c.trashDocument(args.project_id, args.document_id);
  return successResult({ message: 'Document moved to trash' });
}

async function getUploads(rawArgs: Record<string, unknown>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const args = GetUploadsArgs.parse(rawArgs);
  const uploads = await c.getUploads(args.project_id, args.vault_id);
  return successResult({ uploads, count: uploads.length });
}

export const handlers = {
  get_documents: getDocuments,
  create_document: createDocument,
  update_document: updateDocument,
  trash_document: trashDocument,
  get_uploads: getUploads,
} as const;
