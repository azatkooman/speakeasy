import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

/**
 * Lint configuration.
 *
 * The point of adding this is not style. It is to have a machine catch the two
 * classes of mistake that have actually reached users in this codebase:
 *
 *  - Hook dependency and rules-of-hooks errors. The settings write-chain bug
 *    that could put one child's settings into another child's profile came from
 *    refs and effects drifting out of step, and there is a stale
 *    `eslint-disable react-hooks/exhaustive-deps` in utils/useRenderedCols.ts
 *    that was suppressing a linter nobody had installed.
 *  - Unused and unreachable code. A dead 272-line modal, an unused type, an
 *    unused import and a prop nothing passes all survived review.
 *
 * Rules that would only produce churn on an existing 11k-line codebase are set
 * to `warn`, so CI fails on real defects and still surfaces the rest. A lint
 * step that is red by default gets ignored, which is worse than none.
 *
 * The warnings are ratcheted rather than ignored: `npm run lint` passes
 * `--max-warnings 64`, the count at the time this was introduced, so the number
 * can be lowered as things are fixed but cannot grow. Without that, a warning
 * list is just a list nobody reads.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'android/**',
      'ios/**',
      'coverage/**',
      'scripts/vocabulary-review.html',
      'node_modules/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.es2022 },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      // --- errors: things that have actually bitten ---
      'react-hooks/rules-of-hooks': 'error',
      'no-unreachable': 'error',
      'no-dupe-keys': 'error',           // a duplicated translation key silently wins
      'no-fallthrough': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],

      // --- warnings: worth seeing, not worth blocking on today ---
      'react-hooks/exhaustive-deps': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrors: 'none',
      }],

      // Empty catch blocks are used deliberately for best-effort native calls.
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  {
    // Tests reach into internals and mock aggressively; that is their job.
    files: ['tests/**/*.ts'],
    languageOptions: { globals: { ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },

  {
    files: ['scripts/**/*.mjs', '*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
);
