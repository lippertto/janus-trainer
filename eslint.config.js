import eslintConfigPrettier from 'eslint-config-prettier/flat';
import reactPlugin from 'eslint-plugin-react';
import playwright from 'eslint-plugin-playwright';

import { defineConfig } from 'eslint/config';
import { includeIgnoreFile } from '@eslint/compat';

import nextPlugin from '@next/eslint-plugin-next';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import { fileURLToPath } from 'url';

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

export default defineConfig([
  includeIgnoreFile(gitignorePath),
  {
    name: 'app-rules',
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['playwright/', 'types/'],
    plugins: {
      react: reactPlugin,
      '@next/next': nextPlugin,
      '@typescript-eslint': ts,
      ts,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { modules: true },
        ecmaVersion: 'latest',
        project: './tsconfig.json',
      },
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      '@next/next/no-html-link-for-pages': 'off',
      // The next lines are a work-around for the following error:
      // TypeError: context.getAncestors is not a function
      '@next/next/no-duplicate-head': 'off',
      '@next/next/no-page-custom-font': 'off',
    },
  },
  {
    name: 'playwright-rules',
    files: ['playwright/**/*.ts'],
    ...playwright.configs['flat/recommended'],
  },
  { ...eslintConfigPrettier },
]);
