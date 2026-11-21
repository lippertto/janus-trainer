import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import {
  CodeDeliveryFailureException,
  CognitoIdentityProviderClient,
  ForgotPasswordCommand,
  InternalErrorException,
  InvalidParameterException,
  LimitExceededException,
  NotAuthorizedException,
  TooManyRequestsException,
  UserNotFoundException,
} from '@aws-sdk/client-cognito-identity-provider';
import { NextRequest } from 'next/server';
import { POST } from '@/app/api/auth/forgot-password/route';

// pino writes straight to the file descriptor, so process.stdout spies would not see it.
const loggerMock = vi.hoisted(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
}));
vi.mock('@/lib/logging', () => ({ logger: loggerMock }));

const cognitoMock = mockClient(CognitoIdentityProviderClient);

const EMAIL = 'someone@example.com';

function request(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/auth/forgot-password', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

function loggedText(): string {
  return JSON.stringify(Object.values(loggerMock).flatMap((f) => f.mock.calls));
}

describe('POST /api/auth/forgot-password', () => {
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

  test('existing account: 200 CODE_SENT, and Cognito is asked to send the code', async () => {
    cognitoMock.on(ForgotPasswordCommand).resolves({
      CodeDeliveryDetails: {
        Destination: 's***@e***.com',
        DeliveryMedium: 'EMAIL',
      },
    });
    const response = await POST(request({ email: EMAIL }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'CODE_SENT' });
    const calls = cognitoMock.commandCalls(ForgotPasswordCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input).toEqual({
      ClientId: 'client-id',
      Username: EMAIL,
    });
  });

  test('a user who never signed in (FORCE_CHANGE_PASSWORD): Cognito resolves, the response is CODE_SENT', async () => {
    // The exact response observed from the dev pool for such a user, via the AWS CLI. Cognito
    // reports a delivery but sends no email. This test only documents that there is no error to
    // handle; it cannot show what Cognito does.
    cognitoMock.on(ForgotPasswordCommand).resolves({
      CodeDeliveryDetails: {
        Destination: 'l***@g***',
        DeliveryMedium: 'EMAIL',
        AttributeName: 'email',
      },
    });
    const response = await POST(
      request({ email: 'never-signed-in@example.com' }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'CODE_SENT' });
  });

  test('the response never contains the delivery destination', async () => {
    cognitoMock.on(ForgotPasswordCommand).resolves({
      CodeDeliveryDetails: {
        Destination: 's***@e***.com',
        DeliveryMedium: 'EMAIL',
      },
    });
    const text = await (await POST(request({ email: EMAIL }))).text();
    expect(text).not.toContain('s***');
  });

  test('unknown account (UserNotFoundException): the identical response', async () => {
    const known = await (async () => {
      cognitoMock.on(ForgotPasswordCommand).resolves({});
      const r = await POST(request({ email: EMAIL }));
      return { status: r.status, body: await r.text() };
    })();

    cognitoMock.reset();
    cognitoMock
      .on(ForgotPasswordCommand)
      .rejects(
        new UserNotFoundException({ message: 'no such user', $metadata: {} }),
      );
    const r = await POST(request({ email: 'nobody@example.com' }));
    expect({ status: r.status, body: await r.text() }).toEqual(known);
  });

  test('a user who cannot reset yet (known InvalidParameterException shape): the identical response', async () => {
    cognitoMock.on(ForgotPasswordCommand).rejects(
      new InvalidParameterException({
        message:
          'Cannot reset password for the user as there is no registered/verified email or phone_number',
        $metadata: {},
      }),
    );
    const response = await POST(request({ email: EMAIL }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'CODE_SENT' });
  });

  test('a disabled user (NotAuthorizedException): the identical response', async () => {
    cognitoMock.on(ForgotPasswordCommand).rejects(
      new NotAuthorizedException({
        message: 'User is disabled.',
        $metadata: {},
      }),
    );
    const response = await POST(request({ email: EMAIL }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'CODE_SENT' });
  });

  test('LimitExceededException (per account) is CODE_SENT too, to avoid an enumeration side channel', async () => {
    cognitoMock
      .on(ForgotPasswordCommand)
      .rejects(
        new LimitExceededException({ message: 'slow down', $metadata: {} }),
      );
    const response = await POST(request({ email: EMAIL }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: 'CODE_SENT' });
  });

  test('general request throttling (TooManyRequestsException) stays a 429: it says nothing about the account', async () => {
    cognitoMock
      .on(ForgotPasswordCommand)
      .rejects(
        new TooManyRequestsException({ message: 'slow down', $metadata: {} }),
      );
    const response = await POST(request({ email: EMAIL }));
    expect(response.status).toBe(429);
    expect((await response.json()).error.code).toBe('TooManyRequests');
  });

  test('does NOT blanket-swallow InvalidParameterException: an unknown shape is a 500', async () => {
    cognitoMock.on(ForgotPasswordCommand).rejects(
      new InvalidParameterException({
        message: 'Auth flow not enabled for this client',
        $metadata: {},
      }),
    );
    const response = await POST(request({ email: EMAIL }));
    expect(response.status).toBe(500);
  });

  test('CodeDeliveryFailureException is a real infra problem: 500', async () => {
    cognitoMock.on(ForgotPasswordCommand).rejects(
      new CodeDeliveryFailureException({
        message: 'SES says no',
        $metadata: {},
      }),
    );
    const response = await POST(request({ email: EMAIL }));
    expect(response.status).toBe(500);
    expect((await response.json()).error.code).toBe('InternalServerError');
  });

  test('an unexpected failure is a 500 without internal details', async () => {
    cognitoMock.on(ForgotPasswordCommand).rejects(
      new InternalErrorException({
        message: 'boom: internal',
        $metadata: {},
      }),
    );
    const response = await POST(request({ email: EMAIL }));
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain('boom');
  });

  test.each([
    ['empty body', {}],
    ['malformed email', { email: 'nope' }],
    ['non-string email', { email: 42 }],
    ['empty email', { email: '' }],
  ])('invalid request (%s): 400 and Cognito is not called', async (_, body) => {
    const response = await POST(request(body));
    expect(response.status).toBe(400);
    expect(cognitoMock.commandCalls(ForgotPasswordCommand)).toHaveLength(0);
  });

  test('a body that is not JSON is a 400', async () => {
    expect((await POST(request('not json'))).status).toBe(400);
  });

  test('swallowed cases are logged by type only, without the email', async () => {
    cognitoMock.on(ForgotPasswordCommand).rejects(
      new UserNotFoundException({
        message: `no user ${EMAIL}`,
        $metadata: {},
      }),
    );
    await POST(request({ email: EMAIL }));
    const logged = loggedText();
    expect(logged).toContain('UserNotFoundException');
    expect(logged).not.toContain(EMAIL);
  });

  test('never logs the email or Cognito error text', async () => {
    const failures = [
      new InvalidParameterException({ message: `bad ${EMAIL}`, $metadata: {} }),
      new CodeDeliveryFailureException({
        message: `to ${EMAIL}`,
        $metadata: {},
      }),
      new Error(`failed for ${EMAIL}`),
    ];
    for (const failure of failures) {
      cognitoMock.reset();
      cognitoMock.on(ForgotPasswordCommand).rejects(failure);
      await POST(request({ email: EMAIL }));
    }
    // the failures must have produced log output, or this test proves nothing
    expect(
      Object.values(loggerMock).flatMap((f) => f.mock.calls).length,
    ).toBeGreaterThan(0);
    expect(loggedText()).not.toContain(EMAIL);
  });
});
