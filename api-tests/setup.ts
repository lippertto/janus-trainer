import { beforeAll } from 'vitest';
import { initTestAuth } from './test-auth';

// Initialize test authentication tokens before all tests
beforeAll(async () => {
  await initTestAuth();
});
