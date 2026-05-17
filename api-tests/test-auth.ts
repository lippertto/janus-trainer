import { encode } from 'next-auth/jwt';
import type { JWT } from 'next-auth/jwt';
import superagent from 'superagent';

const TEST_JWT_SECRET = 'test-secret-for-api-tests-only';

// Cached tokens to avoid regenerating them for every request
let cachedAdminToken: string | null = null;
let cachedTrainerToken: string | null = null;

interface TestUserOptions {
  userId: string;
  name: string;
  email: string;
  groups: string[];
}

/**
 * Generate a test JWT token for API tests.
 * This creates a valid NextAuth JWT that will pass authentication checks.
 */
export async function generateTestToken(
  options: TestUserOptions,
): Promise<string> {
  const token: JWT = {
    sub: options.userId,
    name: options.name,
    email: options.email,
    groups: options.groups,
    accessToken: 'test-access-token',
    refreshToken: 'test-refresh-token',
    accessTokenExpires: Date.now() + 3600 * 1000, // 1 hour from now
  };

  return await encode({
    token,
    secret: TEST_JWT_SECRET,
  });
}

/**
 * Generate an admin token for API tests
 */
export async function generateAdminToken() {
  if (!cachedAdminToken) {
    cachedAdminToken = await generateTestToken({
      userId: '502c79bc-e051-70f5-048c-5619e49e2383',
      name: 'Test-User Admin',
      email: 'admin@test.com',
      groups: ['admins'],
    });
  }
  return cachedAdminToken;
}

/**
 * Generate a trainer token for API tests
 */
export async function generateTrainerToken() {
  if (!cachedTrainerToken) {
    cachedTrainerToken = await generateTestToken({
      userId: '80ac598c-e0b1-7040-5e0e-6fd257a53699',
      name: 'Test-User Trainer',
      email: 'trainer@test.com',
      groups: ['trainers'],
    });
  }
  return cachedTrainerToken;
}

/**
 * Get the JWT secret used for test tokens.
 * This should match the NEXTAUTH_SECRET in the test environment.
 */
export function getTestJwtSecret(): string {
  return TEST_JWT_SECRET;
}

/**
 * Add authentication to a superagent request.
 * Token must be provided or pre-generated.
 */
export function withAuth(
  request: superagent.SuperAgentRequest,
  token: string,
): superagent.SuperAgentRequest {
  return request.set('Cookie', `next-auth.session-token=${token}`);
}

/**
 * Add admin authentication to a superagent request.
 * This is synchronous and uses a pre-generated cached token.
 */
export function withAdminAuth(
  request: superagent.SuperAgentRequest,
): superagent.SuperAgentRequest {
  if (!cachedAdminToken) {
    throw new Error(
      'Admin token not initialized. Call await initTestAuth() before running tests.',
    );
  }
  return withAuth(request, cachedAdminToken);
}

/**
 * Add trainer authentication to a superagent request.
 * This is synchronous and uses a pre-generated cached token.
 */
export function withTrainerAuth(
  request: superagent.SuperAgentRequest,
): superagent.SuperAgentRequest {
  if (!cachedTrainerToken) {
    throw new Error(
      'Trainer token not initialized. Call await initTestAuth() before running tests.',
    );
  }
  return withAuth(request, cachedTrainerToken);
}

/**
 * Initialize test authentication by pre-generating tokens.
 * Call this once before running tests (e.g., in global setup).
 */
export async function initTestAuth(): Promise<void> {
  await generateAdminToken();
  await generateTrainerToken();
}
