import eslintConfigPrettier from 'eslint-config-prettier';
import reactPlugin from 'eslint-plugin-react';
import playwright from 'eslint-plugin-playwright';

import nextPlugin from '@next/eslint-plugin-next';
import ts from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

export default [
  // this is a global pattern
  {
    ignores: [
      '.next/',
      'next.config.mjs',
      'jest.config.js',
      'eslint.config.mjs',
    ],
  },
  { ...eslintConfigPrettier },
  {
    name: 'app-rules',
    files: ['**/*.ts', '**/*.tsx'],
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
    ignores: ['playwright/'],
  },
  {
    ...playwright.configs['flat/recommended'],
    files: ['playwright/**/*.ts'],
  },
];
