import type { BasecampClient } from './basecamp-client.js';

const DEFAULT_SENTINEL = 'MCP_TEST_SANDBOX';

/**
 * Refuses to proceed unless:
 *   1. BASECAMP_TEST_PROJECT_ID is set in the environment.
 *   2. The named project's `name` contains the sandbox sentinel
 *      (default 'MCP_TEST_SANDBOX'; overrideable via
 *      BASECAMP_TEST_PROJECT_NAME_GUARD).
 *
 * Returns the validated project ID for downstream use.
 *
 * Two layers of opt-in. If either is absent, the live suite refuses to
 * write anything to the user's account.
 */
export async function assertSandbox(client: BasecampClient): Promise<string> {
  const projectId = process.env.BASECAMP_TEST_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      'BASECAMP_TEST_PROJECT_ID is not set. Refusing to run live tests against an unspecified project.',
    );
  }
  const sentinel = process.env.BASECAMP_TEST_PROJECT_NAME_GUARD ?? DEFAULT_SENTINEL;
  const project = await client.getProject(projectId);
  if (!project.name?.includes(sentinel)) {
    throw new Error(
      `Project ${projectId} ('${project.name}') does not contain the sandbox sentinel '${sentinel}' in its name. Refusing to run live tests.`,
    );
  }
  return projectId;
}
