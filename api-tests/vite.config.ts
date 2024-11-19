import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['api-tests/*.test.ts'],
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
