import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CognitoIdentityProviderClient,
  InvalidPasswordException,
  NotAuthorizedException,
  RespondToAuthChallengeCommand,
  TooManyRequestsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/respond-to-new-password-challenge/route';
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

const NEW_PASSWORD = 'N3w-secret-pw!';
const ACCESS_TOKEN = 'cognito-access-token';
const REFRESH_TOKEN = 'cognito-refresh-token';
const ID_TOKEN = fakeIdToken({
  sub: 'sub-123',
  email: 'trainer@example.com',
  name: 'Tina Trainer',
  'cognito:groups': ['trainers'],
});
const COGNITO_SESSION = 'cognito-session-string';

const validBody = {
  email: 'trainer@example.com',
  challengeUsername: 'uuid-username',
  newPassword: NEW_PASSWORD,
  session: COGNITO_SESSION,
};

function request(body: unknown): NextRequest {
  return new NextRequest(
    'http://localhost/api/auth/respond-to-new-password-challenge',
    {
      method: 'POST',
      body: typeof body === 'string' ? body : JSON.stringify(body),
    },
  );
}

function loggedText(): string {
  return JSON.stringify(Object.values(loggerMock).flatMap((f) => f.mock.calls));
}

describe('POST /api/auth/respond-to-new-password-challenge', () => {
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
    cognitoMock.on(RespondToAuthChallengeCommand).resolves({
      AuthenticationResult: {
        AccessToken: ACCESS_TOKEN,
        RefreshToken: REFRESH_TOKEN,
        IdToken: ID_TOKEN,
        ExpiresIn: 3600,
      },
    });
  }

  test('valid input returns a ticket and no Cognito tokens', async () => {
    cognitoSucceeds();

    const response = await POST(request(validBody));
    const text = await response.text();
    const body = JSON.parse(text);

    expect(response.status).toBe(200);
    expect(Object.keys(body).sort()).toEqual(['status', 'ticket']);
    expect(body.status).toBe('SUCCESS');
    for (const secret of [ACCESS_TOKEN, REFRESH_TOKEN, ID_TOKEN]) {
      expect(text).not.toContain(secret);
    }
    expect(await readLoginTicket(body.ticket)).toMatchObject({
      sub: 'sub-123',
      email: 'trainer@example.com',
      name: 'Tina Trainer',
      groups: ['trainers'],
      accessToken: ACCESS_TOKEN,
      refreshToken: REFRESH_TOKEN,
      expiresIn: 3600,
    });
  });

  test('uses challengeUsername (not the typed email) as USERNAME', async () => {
    cognitoSucceeds();
    await POST(request(validBody));

    const calls = cognitoMock.commandCalls(RespondToAuthChallengeCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toEqual({
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      ClientId: 'client-id',
      Session: COGNITO_SESSION,
      ChallengeResponses: {
        USERNAME: 'uuid-username',
        NEW_PASSWORD: NEW_PASSWORD,
      },
    });
  });

  test('a password that violates the pool policy: 400 InvalidPassword with Cognito detail', async () => {
    cognitoMock.on(RespondToAuthChallengeCommand).rejects(
      new InvalidPasswordException({
        message: 'Password did not conform with policy: too short',
        $metadata: {},
      }),
    );
    const response = await POST(request(validBody));
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error.code).toBe('InvalidPassword');
    expect(body.error.message).toContain('too short');
  });

  test('an expired or invalid session: 401 telling the user to start over', async () => {
    cognitoMock.on(RespondToAuthChallengeCommand).rejects(
      new NotAuthorizedException({
        message: 'Invalid session for the user.',
        $metadata: {},
      }),
    );
    const response = await POST(request(validBody));
    const body = await response.json();
    expect(response.status).toBe(401);
    expect(body.error.code).toBe('Unauthorized');
    expect(body.error.message).toMatch(/erneut an/);
    expect(body.error.message).not.toMatch(/Passwort ist falsch/);
  });

  test('Cognito throttling: 429', async () => {
    cognitoMock
      .on(RespondToAuthChallengeCommand)
      .rejects(
        new TooManyRequestsException({ message: 'slow', $metadata: {} }),
      );
    const response = await POST(request(validBody));
    expect(response.status).toBe(429);
    expect((await response.json()).error.code).toBe('TooManyRequests');
  });

  test.each([
    ['empty body', {}],
    ['malformed email', { ...validBody, email: 'nope' }],
    [
      'missing challengeUsername',
      { ...validBody, challengeUsername: undefined },
    ],
    ['empty challengeUsername', { ...validBody, challengeUsername: '' }],
    ['missing newPassword', { ...validBody, newPassword: undefined }],
    ['empty newPassword', { ...validBody, newPassword: '' }],
    ['missing session', { ...validBody, session: undefined }],
    ['empty session', { ...validBody, session: '' }],
    ['non-string newPassword', { ...validBody, newPassword: 12345678 }],
  ])('invalid request (%s): 400 and Cognito is not called', async (_, body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(
      cognitoMock.commandCalls(RespondToAuthChallengeCommand),
    ).toHaveLength(0);
  });

  test('a body that is not JSON is a 400', async () => {
    expect((await POST(request('not json'))).status).toBe(400);
  });

  test('does not enforce any password length itself: Cognito decides', async () => {
    cognitoSucceeds();
    const response = await POST(request({ ...validBody, newPassword: 'a' }));
    expect(response.status).toBe(200);
    expect(
      cognitoMock.commandCalls(RespondToAuthChallengeCommand),
    ).toHaveLength(1);
  });

  test('another challenge in the response is a 500, not a ticket', async () => {
    cognitoMock.on(RespondToAuthChallengeCommand).resolves({
      ChallengeName: 'SMS_MFA',
      Session: COGNITO_SESSION,
    });
    const response = await POST(request(validBody));
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain('ticket');
    expect(text).not.toContain(COGNITO_SESSION);
    expect(loggedText()).toContain('Unsupported challenge: SMS_MFA');
  });

  test('an incomplete authentication result is a 500', async () => {
    cognitoMock.on(RespondToAuthChallengeCommand).resolves({
      AuthenticationResult: { AccessToken: ACCESS_TOKEN },
    });
    const response = await POST(request(validBody));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain(ACCESS_TOKEN);
    expect(loggedText()).toContain('incomplete authentication result');
  });

  test('an unexpected failure is a 500 without internal details', async () => {
    cognitoMock
      .on(RespondToAuthChallengeCommand)
      .rejects(new Error('boom: internal'));
    const response = await POST(request(validBody));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('boom');
  });

  test('never logs the new password, tokens, ticket or Cognito session', async () => {
    const spies = [
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'info'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'error'),
    ];
    spies.forEach((s) => s.mockImplementation(() => {}));

    cognitoSucceeds();
    const ok = await (await POST(request(validBody))).json();

    const failures = [
      new Error(`failed ${NEW_PASSWORD} ${COGNITO_SESSION}`),
      new NotAuthorizedException({ message: COGNITO_SESSION, $metadata: {} }),
      new InvalidPasswordException({ message: 'policy', $metadata: {} }),
    ];
    for (const failure of failures) {
      cognitoMock.reset();
      cognitoMock.on(RespondToAuthChallengeCommand).rejects(failure);
      await POST(request(validBody));
    }
    cognitoMock.reset();
    cognitoMock.on(RespondToAuthChallengeCommand).resolves({
      ChallengeName: 'SMS_MFA',
      Session: COGNITO_SESSION,
    });
    await POST(request(validBody));

    // the unexpected failures must have produced log output, or this test proves nothing
    expect(
      Object.values(loggerMock).flatMap((f) => f.mock.calls).length,
    ).toBeGreaterThan(0);
    const logged = JSON.stringify([
      ...spies.flatMap((s) => s.mock.calls),
      ...Object.values(loggerMock).flatMap((f) => f.mock.calls),
    ]);
    for (const secret of [
      NEW_PASSWORD,
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
