import type { AxiosInstance } from 'axios';
import { applyUpdate } from '../update-merge.js';
import type {
  Comment,
  CommentCreateBody,
  CommentUpdateBody,
} from '../../types/basecamp.js';

const COMMENT_UPDATE_WHITELIST = [
  'content',
] as const satisfies ReadonlyArray<keyof CommentUpdateBody & keyof Comment>;

export async function getComment(
  client: AxiosInstance,
  projectId: string,
  commentId: string,
): Promise<Comment> {
  const response = await client.get(`/buckets/${projectId}/comments/${commentId}.json`);
  return response.data;
}

export async function createComment(
  client: AxiosInstance,
  projectId: string,
  recordingId: string,
  body: CommentCreateBody,
): Promise<Comment> {
  const response = await client.post(
    `/buckets/${projectId}/recordings/${recordingId}/comments.json`,
    body,
  );
  return response.data;
}

export async function updateComment(
  client: AxiosInstance,
  projectId: string,
  commentId: string,
  patch: CommentUpdateBody,
): Promise<Comment> {
  return applyUpdate<Comment, CommentUpdateBody>(
    'partial',
    patch,
    () => getComment(client, projectId, commentId),
    async (body) => {
      const response = await client.put(
        `/buckets/${projectId}/comments/${commentId}.json`,
        body,
      );
      return response.data;
    },
    COMMENT_UPDATE_WHITELIST,
  );
}
