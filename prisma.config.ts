import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    url: process.env.POSTGRES_CONNECTION_URL || 'no-datasource-configured',
  },
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
