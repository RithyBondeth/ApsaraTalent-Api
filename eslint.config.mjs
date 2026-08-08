import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: currentDirectory });

// The typed rules need `parserOptions.project`, so they can only apply to
// files the tsconfig actually includes. Without this `files` scope every
// .mjs script fails to parse — which is why they were excluded from
// `lint:check` entirely, leaving a meaningful amount of release behaviour
// (the deploy, rollback, backup and migration-rehearsal scripts) unchecked.
const typescript = compat
  .config({
    parser: '@typescript-eslint/parser',
    parserOptions: {
      project: 'tsconfig.json',
      tsconfigRootDir: currentDirectory,
      sourceType: 'module',
    },
    plugins: ['@typescript-eslint/eslint-plugin', 'unused-imports'],
    extends: [
      'plugin:@typescript-eslint/recommended',
      'plugin:prettier/recommended',
    ],
    env: { node: true, jest: true },
    rules: {
      '@typescript-eslint/interface-name-prefix': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],
    },
  })
  .map((config) => ({ ...config, files: ['**/*.ts'] }));

// Plain ESM, parsed by the default parser. These scripts are not TypeScript
// and are not in any tsconfig project, so they get formatting and the
// untyped correctness rules only — which is still strictly more than the
// nothing they had before.
const nodeScripts = [
  { ...js.configs.recommended, files: ['**/*.mjs'] },
  ...compat
    .config({
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
      plugins: ['unused-imports'],
      extends: ['plugin:prettier/recommended'],
      env: { node: true, es2024: true },
      rules: {
        'unused-imports/no-unused-imports': 'error',
        // A deliberately empty catch is a real pattern in these scripts:
        // cleanup that must never mask the error it is cleaning up after.
        'no-empty': ['error', { allowEmptyCatch: true }],
      },
    })
    .map((config) => ({ ...config, files: ['**/*.mjs'] })),
];

export default [
  { ignores: ['dist/**', 'coverage/**', 'node_modules/**'] },
  ...typescript,
  ...nodeScripts,
];
