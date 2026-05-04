import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/test/live/**/*.test.ts'],
    // Live tests are sequential — they share a real sandbox project and
    // teardown order matters.
    fileParallelism: false,
    sequence: { concurrent: false },
    // Each lifecycle test creates a real Basecamp record; give BC3 time.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Don't watch — explicit one-shot runs only.
    watch: false,
  },
});
