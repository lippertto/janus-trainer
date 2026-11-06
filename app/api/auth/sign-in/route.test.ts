import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  NotAuthorizedException,
  TooManyRequestsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/sign-in/route';
import { readLoginTicket } from '@/lib/login-ticket';
import { fakeIdToken } from '@/app/api/users/cognito-test-utils';

// pino writes straight to the file descriptor, so process.stdout spies would not see it.
const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));
vi.mock('@/lib/logging', () => ({ logger: loggerMock }));

const cognitoMock = mockClient(CognitoIdentityProviderClient);

const PASSWORD = 'Sup3r-secret-pw!';
const ACCESS_TOKEN = 'cognito-access-token';
const REFRESH_TOKEN = 'cognito-refresh-token';
const ID_TOKEN = fakeIdToken({
  sub: 'sub-123',
  email: 'trainer@example.com',
  name: 'Tina Trainer',
  'cognito:groups': ['trainers'],
});
const COGNITO_SESSION = 'cognito-session-string';

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/sign-in', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const validBody = { email: 'trainer@example.com', password: PASSWORD };

describe('POST /api/auth/sign-in', () => {
  beforeEach(() => {
    cognitoMock.reset();
    Object.values(loggerMock).forEach((f) => f.mockReset());
    vi.stubEnv('NEXTAUTH_SECRET', 'a-test-secret-that-is-long-enough-for-hkdf');
    vi.stubEnv('AWS_REGION', 'eu-north-1');
    vi.stubEnv('COGNITO_CLIENT_ID', 'client-id');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function cognitoSucceeds() {
    cognitoMock.on(InitiateAuthCommand).resolves({
      AuthenticationResult: {
        AccessToken: ACCESS_TOKEN,
        RefreshToken: REFRESH_TOKEN,
        IdToken: ID_TOKEN,
        ExpiresIn: 3600,
      },
    });
  }

  test('valid credentials return a ticket and no Cognito tokens', async () => {
    cognitoSucceeds();

    const response = await POST(request(validBody));
    const text = await response.text();
    const body = JSON.parse(text);

    expect(response.status).toBe(200);
    expect(body.status).toBe('SUCCESS');
    expect(Object.keys(body).sort()).toEqual(['status', 'ticket']);
    for (const secret of [ACCESS_TOKEN, REFRESH_TOKEN, ID_TOKEN]) {
      expect(text).not.toContain(secret);
    }

    const ticket = await readLoginTicket(body.ticket);
    expect(ticket).toMatchObject({
      sub: 'sub-123',
      email: 'trainer@example.com',
      name: 'Tina Trainer',
      groups: ['trainers'],
      accessToken: ACCESS_TOKEN,
      refreshToken: REFRESH_TOKEN,
      expiresIn: 3600,
    });
  });

  test('calls Cognito with USER_PASSWORD_AUTH', async () => {
    cognitoSucceeds();
    await POST(request(validBody));
    const calls = cognitoMock.commandCalls(InitiateAuthCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toEqual({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: 'client-id',
      AuthParameters: { USERNAME: 'trainer@example.com', PASSWORD },
    });
  });

  test('wrong password / unknown user: 401 with the generic message', async () => {
    cognitoMock.on(InitiateAuthCommand).rejects(
      new NotAuthorizedException({
        message: 'Incorrect username or password.',
        $metadata: {},
      }),
    );
    const response = await POST(request(validBody));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: {
        code: 'Unauthorized',
        message: 'E-Mail oder Passwort ist falsch.',
      },
    });
  });

  test('NEW_PASSWORD_REQUIRED returns the challenge, without a ticket', async () => {
    cognitoMock.on(InitiateAuthCommand).resolves({
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      Session: COGNITO_SESSION,
      ChallengeParameters: {
        USER_ID_FOR_SRP: 'uuid-username',
        userAttributes: '{"email":"trainer@example.com"}',
        requiredAttributes: '[]',
      },
    });
    const response = await POST(request(validBody));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: 'CHALLENGE',
      challengeName: 'NEW_PASSWORD_REQUIRED',
      session: COGNITO_SESSION,
      challengeUsername: 'uuid-username',
    });
  });

  test('an unsupported challenge is a 500, not a ticket', async () => {
    cognitoMock.on(InitiateAuthCommand).resolves({
      ChallengeName: 'SMS_MFA',
      Session: COGNITO_SESSION,
    });
    const response = await POST(request(validBody));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('ticket');
  });

  test.each([
    ['no body fields', {}],
    ['malformed email', { email: 'nope', password: 'x' }],
    ['missing password', { email: 'a@b.de' }],
    ['empty password', { email: 'a@b.de', password: '' }],
  ])('invalid request (%s): 400 and Cognito is not called', async (_, body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(cognitoMock.commandCalls(InitiateAuthCommand)).toHaveLength(0);
  });

  test('a body that is not JSON is a 400', async () => {
    const response = await POST(request('not json'));
    expect(response.status).toBe(400);
  });

  test('Cognito throttling: 429', async () => {
    cognitoMock
      .on(InitiateAuthCommand)
      .rejects(
        new TooManyRequestsException({ message: 'slow down', $metadata: {} }),
      );
    const response = await POST(request(validBody));
    expect(response.status).toBe(429);
    expect((await response.json()).error.code).toBe('TooManyRequests');
  });

  test('an unexpected failure is a 500 without internal details', async () => {
    cognitoMock.on(InitiateAuthCommand).rejects(new Error('boom: internal'));
    const response = await POST(request(validBody));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('boom');
  });

  test('never logs the password, tokens, ticket or Cognito session', async () => {
    const spies = [
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'info'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'error'),
      vi.spyOn(process.stdout, 'write'),
      vi.spyOn(process.stderr, 'write'),
    ];
    spies.forEach((s) => s.mockImplementation(() => true));

    // success
    cognitoSucceeds();
    const ok = await (await POST(request(validBody))).json();
    // challenge
    cognitoMock.reset();
    cognitoMock.on(InitiateAuthCommand).resolves({
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      Session: COGNITO_SESSION,
      ChallengeParameters: { USER_ID_FOR_SRP: 'u' },
    });
    await POST(request(validBody));
    // failures
    cognitoMock.reset();
    cognitoMock
      .on(InitiateAuthCommand)
      .rejects(new Error(`failed ${PASSWORD}`));
    await POST(request(validBody));
    cognitoMock.reset();
    cognitoMock
      .on(InitiateAuthCommand)
      .rejects(new NotAuthorizedException({ message: 'no', $metadata: {} }));
    await POST(request(validBody));

    const loggerCalls = Object.values(loggerMock).flatMap((f) => f.mock.calls);
    // the failure cases must actually have produced log output, or this test proves nothing
    expect(loggerCalls.length).toBeGreaterThan(0);
    const logged = JSON.stringify([
      ...spies.flatMap((s) => s.mock.calls),
      ...loggerCalls,
    ]);
    for (const secret of [
      PASSWORD,
      ACCESS_TOKEN,
      REFRESH_TOKEN,
      ID_TOKEN,
      COGNITO_SESSION,
      ok.ticket,
    ]) {
      expect(logged).not.toContain(secret);
    }
  });
});
