// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', 'results/', 'monitoring/'] },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: { '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }] },
  },
  { files: ['**/*.mjs'], ...tseslint.configs.disableTypeChecked },
  {
    // Node scripts; `document` is used inside Playwright's page.evaluate (browser context).
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        ...Object.fromEntries(['process', 'console', 'fetch', 'URL', 'URLSearchParams'].map((g) => [g, 'readonly'])),
        document: 'readonly',
      },
    },
  },
);
