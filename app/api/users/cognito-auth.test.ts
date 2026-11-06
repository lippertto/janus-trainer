import { describe, expect, test } from 'vitest';
import {
  CodeMismatchException,
  ExpiredCodeException,
  InvalidPasswordException,
  LimitExceededException,
  NotAuthorizedException,
  TooManyRequestsException,
  TooManyFailedAttemptsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { fakeIdToken } from '@/app/api/users/cognito-test-utils';
import {
  decodeIdToken,
  mapCognitoErrorToUserMessage,
} from '@/app/api/users/cognito-auth';

function awsError<T extends Error>(
  Type: new (args: any) => T,
  message = 'cognito says no',
): T {
  return new Type({ message, $metadata: {} });
}

describe('mapCognitoErrorToUserMessage', () => {
  test('NotAuthorizedException on sign-in is a generic credentials error', () => {
    const result = mapCognitoErrorToUserMessage(
      awsError(NotAuthorizedException, 'Incorrect username or password.'),
    );
    expect(result).toEqual({
      code: 'Unauthorized',
      httpStatus: 401,
      message: 'E-Mail oder Passwort ist falsch.',
    });
  });

  test('NotAuthorizedException on the challenge means the session ran out', () => {
    const result = mapCognitoErrorToUserMessage(
      awsError(NotAuthorizedException),
      'challenge',
    );
    expect(result.httpStatus).toBe(401);
    expect(result.code).toBe('Unauthorized');
    expect(result.message).toMatch(/erneut an/);
    expect(result.message).not.toMatch(/Passwort ist falsch/);
  });

  test('InvalidPasswordException is a 400 with generic text plus the Cognito detail', () => {
    const result = mapCognitoErrorToUserMessage(
      awsError(
        InvalidPasswordException,
        'Password did not conform with policy: Password not long enough',
      ),
    );
    expect(result.httpStatus).toBe(400);
    expect(result.code).toBe('InvalidPassword');
    expect(result.message).toMatch(/Anforderungen/);
    expect(result.message).toContain('Password not long enough');
  });

  test('InvalidPasswordException without detail still has a message', () => {
    const result = mapCognitoErrorToUserMessage(
      awsError(InvalidPasswordException, ''),
    );
    expect(result.message).toMatch(/Anforderungen/);
  });

  test('does not hardcode any password rule in the generic text', () => {
    const result = mapCognitoErrorToUserMessage(
      awsError(InvalidPasswordException, ''),
    );
    expect(result.message).not.toMatch(
      /\d+ Zeichen|Großbuchstabe|Sonderzeichen/,
    );
  });

  test('CodeMismatchException', () => {
    expect(
      mapCognitoErrorToUserMessage(awsError(CodeMismatchException)),
    ).toEqual({
      code: 'CodeMismatch',
      httpStatus: 400,
      message: 'Der Code ist falsch.',
    });
  });

  test('ExpiredCodeException', () => {
    expect(
      mapCognitoErrorToUserMessage(awsError(ExpiredCodeException)),
    ).toEqual({
      code: 'CodeExpired',
      httpStatus: 400,
      message: 'Der Code ist abgelaufen, bitte fordere einen neuen an.',
    });
  });

  test.each([
    LimitExceededException,
    TooManyRequestsException,
    TooManyFailedAttemptsException,
  ])('%o maps to 429', (Type) => {
    const result = mapCognitoErrorToUserMessage(awsError(Type as any));
    expect(result).toEqual({
      code: 'TooManyRequests',
      httpStatus: 429,
      message: 'Zu viele Versuche, bitte später erneut versuchen.',
    });
  });

  test('unknown errors become a generic 500 and do not leak details', () => {
    const result = mapCognitoErrorToUserMessage(
      new Error('secret internal detail with token abc'),
    );
    expect(result.httpStatus).toBe(500);
    expect(result.code).toBe('InternalServerError');
    expect(result.message).not.toContain('secret');
  });

  test('non-error values become a generic 500', () => {
    expect(mapCognitoErrorToUserMessage('boom').httpStatus).toBe(500);
    expect(mapCognitoErrorToUserMessage(undefined).httpStatus).toBe(500);
  });
});

describe('decodeIdToken', () => {
  test('reads sub, email, name and groups', () => {
    const token = fakeIdToken({
      sub: 'abc',
      email: 'a@example.com',
      name: 'Anna',
      'cognito:groups': ['admins', 'trainers'],
    });
    expect(decodeIdToken(token)).toEqual({
      sub: 'abc',
      email: 'a@example.com',
      name: 'Anna',
      groups: ['admins', 'trainers'],
    });
  });

  test('missing groups claim yields an empty list', () => {
    const token = fakeIdToken({ sub: 'abc', email: 'a@b.de', name: 'A' });
    expect(decodeIdToken(token).groups).toEqual([]);
  });

  test('throws on a malformed token without echoing it', () => {
    expect(() => decodeIdToken('garbage')).toThrow(/ID token/);
    try {
      decodeIdToken('garbage');
    } catch (e) {
      expect((e as Error).message).not.toContain('garbage');
    }
  });

  test('throws when sub is missing', () => {
    expect(() => decodeIdToken(fakeIdToken({ email: 'a@b.de' }))).toThrow(
      /ID token/,
    );
  });
});
