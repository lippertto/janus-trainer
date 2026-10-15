import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CodeMismatchException,
  CognitoIdentityProviderClient,
  ConfirmForgotPasswordCommand,
  ExpiredCodeException,
  InvalidPasswordException,
  LimitExceededException,
  NotAuthorizedException,
  TooManyFailedAttemptsException,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/confirm-forgot-password/route';

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
const CODE = '918273';
const validBody = {
  email: 'someone@example.com',
  confirmationCode: CODE,
  newPassword: NEW_PASSWORD,
};

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/confirm-forgot-password', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function loggedText(): string {
  return JSON.stringify(Object.values(loggerMock).flatMap((f) => f.mock.calls));
}

describe('POST /api/auth/confirm-forgot-password', () => {
  beforeEach(() => {
    cognitoMock.reset();
    Object.values(loggerMock).forEach((f) => f.mockReset());
    vi.stubEnv('AWS_REGION', 'eu-north-1');
    vi.stubEnv('COGNITO_CLIENT_ID', 'client-id');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  test('valid code and password: 200 PASSWORD_RESET, and no tokens or sign-in', async () => {
    cognitoMock.on(ConfirmForgotPasswordCommand).resolves({});
    const response = await POST(request(validBody));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'PASSWORD_RESET' });
    const calls = cognitoMock.commandCalls(ConfirmForgotPasswordCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toEqual({
      ClientId: 'client-id',
      Username: 'someone@example.com',
      ConfirmationCode: CODE,
      Password: NEW_PASSWORD,
    });
  });

  test('wrong code: 400 CodeMismatch', async () => {
    cognitoMock
      .on(ConfirmForgotPasswordCommand)
      .rejects(
        new CodeMismatchException({ message: 'Invalid code', $metadata: {} }),
      );
    const response = await POST(request(validBody));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: 'CodeMismatch', message: 'Der Code ist falsch.' },
    });
  });

  test('expired code: 400 CodeExpired', async () => {
    cognitoMock
      .on(ConfirmForgotPasswordCommand)
      .rejects(new ExpiredCodeException({ message: 'expired', $metadata: {} }));
    const response = await POST(request(validBody));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: 'CodeExpired',
        message: 'Der Code ist abgelaufen, bitte fordere einen neuen an.',
      },
    });
  });

  test('password fails the pool policy: 400 InvalidPassword with the Cognito detail', async () => {
    cognitoMock.on(ConfirmForgotPasswordCommand).rejects(
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

  test.each([TooManyFailedAttemptsException, LimitExceededException])(
    'too many attempts (%o): 429',
    async (Type) => {
      cognitoMock
        .on(ConfirmForgotPasswordCommand)
        .rejects(new (Type as any)({ message: 'slow', $metadata: {} }));
      const response = await POST(request(validBody));
      expect(response.status).toBe(429);
      expect((await response.json()).error.code).toBe('TooManyRequests');
    },
  );

  test('an unknown account looks exactly like a wrong code', async () => {
    cognitoMock
      .on(ConfirmForgotPasswordCommand)
      .rejects(new CodeMismatchException({ message: 'x', $metadata: {} }));
    const wrongCode = await POST(request(validBody));
    const wrongCodeBody = await wrongCode.text();

    cognitoMock.reset();
    cognitoMock
      .on(ConfirmForgotPasswordCommand)
      .rejects(
        new UserNotFoundException({ message: 'no user', $metadata: {} }),
      );
    const unknown = await POST(request(validBody));
    expect({ status: unknown.status, body: await unknown.text() }).toEqual({
      status: wrongCode.status,
      body: wrongCodeBody,
    });
  });

  test('a disabled user looks like a wrong code, not like a sign-in failure', async () => {
    cognitoMock.on(ConfirmForgotPasswordCommand).rejects(
      new NotAuthorizedException({
        message: 'User is disabled.',
        $metadata: {},
      }),
    );
    const response = await POST(request(validBody));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe('CodeMismatch');
    expect(body.error.message).not.toMatch(/Passwort ist falsch/);
  });

  test('does not enforce any password length itself: Cognito decides', async () => {
    cognitoMock.on(ConfirmForgotPasswordCommand).resolves({});
    const response = await POST(request({ ...validBody, newPassword: 'a' }));
    expect(response.status).toBe(200);
  });

  test.each([
    ['empty body', {}],
    ['malformed email', { ...validBody, email: 'nope' }],
    ['missing code', { ...validBody, confirmationCode: undefined }],
    ['empty code', { ...validBody, confirmationCode: '' }],
    ['non-string code', { ...validBody, confirmationCode: 918273 }],
    ['missing newPassword', { ...validBody, newPassword: undefined }],
    ['empty newPassword', { ...validBody, newPassword: '' }],
  ])('invalid request (%s): 400 and Cognito is not called', async (_, body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(cognitoMock.commandCalls(ConfirmForgotPasswordCommand)).toHaveLength(
      0,
    );
  });

  test('a body that is not JSON is a 400', async () => {
    expect((await POST(request('not json'))).status).toBe(400);
  });

  test('an unexpected failure is a 500 without internal details', async () => {
    cognitoMock
      .on(ConfirmForgotPasswordCommand)
      .rejects(new Error('boom: internal'));
    const response = await POST(request(validBody));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('boom');
  });

  test('never logs the code, the new password or the email', async () => {
    const spies = [
      vi.spyOn(console, 'log'),
      vi.spyOn(console, 'info'),
      vi.spyOn(console, 'warn'),
      vi.spyOn(console, 'error'),
    ];
    spies.forEach((s) => s.mockImplementation(() => {}));

    const failures = [
      new Error(`failed ${NEW_PASSWORD} ${CODE} ${validBody.email}`),
      new CodeMismatchException({ message: CODE, $metadata: {} }),
      new InvalidPasswordException({ message: 'policy', $metadata: {} }),
      new NotAuthorizedException({ message: CODE, $metadata: {} }),
    ];
    for (const failure of failures) {
      cognitoMock.reset();
      cognitoMock.on(ConfirmForgotPasswordCommand).rejects(failure);
      await POST(request(validBody));
    }
    cognitoMock.reset();
    cognitoMock.on(ConfirmForgotPasswordCommand).resolves({});
    await POST(request(validBody));

    // the unexpected failure must have produced log output, or this test proves nothing
    expect(
      Object.values(loggerMock).flatMap((f) => f.mock.calls).length,
    ).toBeGreaterThan(0);
    const logged = JSON.stringify([
      ...spies.flatMap((s) => s.mock.calls),
      ...Object.values(loggerMock).flatMap((f) => f.mock.calls),
    ]);
    for (const secret of [NEW_PASSWORD, CODE, validBody.email]) {
      expect(logged).not.toContain(secret);
    }
    expect(loggedText().length).toBeGreaterThan(2);
  });
});
