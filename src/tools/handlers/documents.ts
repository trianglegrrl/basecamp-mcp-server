import type { BasecampClient } from '../../lib/basecamp-client.js';
import type { MCPToolResultEnvelope } from '../result.js';
import { successResult } from '../result.js';

async function getDocuments(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const documents = await c.getDocuments(args.project_id, args.vault_id);
  return successResult({ documents, count: documents.length });
}

async function createDocument(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const document = await c.createDocument(args.project_id, args.vault_id, args.title, args.content);
  return successResult({ document });
}

async function updateDocument(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  const document = await c.updateDocument(args.project_id, args.document_id, args.title, args.content);
  return successResult({ document, message: 'Document updated' });
}

async function trashDocument(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
  await c.trashDocument(args.project_id, args.document_id);
  return successResult({ message: 'Document moved to trash' });
}

async function getUploads(args: Record<string, any>, c: BasecampClient): Promise<MCPToolResultEnvelope> {
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
