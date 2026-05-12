import type { AxiosInstance } from 'axios';
import { applyUpdate } from '../update-merge.js';
import type {
  BasecampProject,
  ProjectCreateBody,
  ProjectUpdateBody,
  ProjectAccessBody,
  ProjectAccessResponse,
} from '../../types/basecamp.js';

const PROJECT_UPDATE_WHITELIST = [
  'name',
  'description',
  'admissions',
  'schedule_attributes',
] as const satisfies ReadonlyArray<keyof ProjectUpdateBody & keyof BasecampProject>;

export async function getProject(
  client: AxiosInstance,
  projectId: string,
): Promise<BasecampProject> {
  const response = await client.get(`/projects/${projectId}.json`);
  return response.data;
}

export async function createProject(
  client: AxiosInstance,
  body: ProjectCreateBody,
): Promise<BasecampProject> {
  const response = await client.post('/projects.json', body);
  return response.data;
}

export async function updateProject(
  client: AxiosInstance,
  projectId: string,
  patch: ProjectUpdateBody,
): Promise<BasecampProject> {
  // BC3's PUT requires `name`. The 'full' merge fetches the current
  // project and supplies `name` from it when the patch doesn't.
  return applyUpdate<BasecampProject, ProjectUpdateBody>(
    'full',
    patch,
    () => getProject(client, projectId),
    async (body) => {
      const response = await client.put(`/projects/${projectId}.json`, body);
      return response.data;
    },
    PROJECT_UPDATE_WHITELIST,
  );
}

export async function trashProject(
  client: AxiosInstance,
  projectId: string,
): Promise<void> {
  await client.delete(`/projects/${projectId}.json`);
}

export async function updateProjectAccess(
  client: AxiosInstance,
  projectId: string,
  body: ProjectAccessBody,
): Promise<ProjectAccessResponse> {
  const response = await client.put(`/projects/${projectId}/people/users.json`, body);
  return response.data;
}
