import { fileURLToPath, URL } from 'url';
import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';

// Load environment variables from .env.development.local
config({ path: '.env.development.local' });

export default defineConfig({
  test: {
    include: ['api-tests/*.test.ts'],
    testTimeout: 50_000,
  },
  resolve: {
    alias: [
      {
        find: '@/',
        replacement: fileURLToPath(new URL('../', import.meta.url)),
      },
    ],
  },
});
