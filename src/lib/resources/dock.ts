import type { AxiosInstance } from 'axios';

export async function getDockEntryWithDetails<T>(
  client: AxiosInstance,
  projectId: string,
  dockName: string,
  detailsPath: (projectId: string, entryId: string) => string,
): Promise<T> {
  const projectResponse = await client.get(`/projects/${projectId}.json`);
  const entry = (projectResponse.data?.dock ?? []).find(
    (d: { name: string }) => d.name === dockName,
  );
  if (!entry) {
    throw new Error(`No ${dockName} dock entry found for project ${projectId}`);
  }
  const detailsResponse = await client.get(
    detailsPath(projectId, String(entry.id)),
  );
  return detailsResponse.data as T;
}
