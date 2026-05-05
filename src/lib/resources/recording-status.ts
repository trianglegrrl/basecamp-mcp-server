import type { AxiosInstance } from 'axios';
import type { RecordingStatus } from '../../types/basecamp.js';

export async function setRecordingStatus(
  client: AxiosInstance,
  projectId: string,
  recordingId: string,
  status: RecordingStatus,
): Promise<void> {
  await client.put(`/buckets/${projectId}/recordings/${recordingId}/status/${status}.json`);
}
