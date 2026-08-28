import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Node, not jsdom: these are domain and storage tests. The IndexedDB they
    // exercise comes from fake-indexeddb, loaded per test file so each one gets
    // a clean database rather than inheriting another file's schema version.
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    // Migrations open and reopen databases; serialising keeps two files from
    // fighting over the same fake-indexeddb instance.
    fileParallelism: false,
  },
});
