import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.tsx', '**/*.test.ts'],
    exclude: ['playwright/**', 'node_modules/**', 'api-tests/**', '.next/**'],
  },
  resolve: {
    alias: [
      {
        find: '@/',
        replacement: fileURLToPath(new URL('./', import.meta.url)),
      },
    ],
  },
});
