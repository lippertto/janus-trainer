import {
  CodeMismatchException,
  ExpiredCodeException,
  InvalidPasswordException,
  LimitExceededException,
  NotAuthorizedException,
  TooManyFailedAttemptsException,
  TooManyRequestsException,
} from '@aws-sdk/client-cognito-identity-provider';

export type MappedCognitoError = {
  code: string;
  message: string;
  httpStatus: number;
};

/**
 * 'sign-in' (default): a NotAuthorizedException means wrong credentials or an unknown user.
 * 'challenge': a NotAuthorizedException means the Cognito session of the challenge ran out.
 */
export type CognitoErrorContext = 'sign-in' | 'challenge';

/**
 * Translates Cognito SDK exceptions into German, user-facing messages.
 *
 * The result never contains the original message of unknown errors, because they might contain
 * sensitive data. The password policy is owned by Cognito, so no password rules are written down
 * here; for InvalidPasswordException, Cognito's own detail text is appended.
 */
export function mapCognitoErrorToUserMessage(
  e: unknown,
  context: CognitoErrorContext = 'sign-in',
): MappedCognitoError {
  if (e instanceof NotAuthorizedException) {
    return {
      code: 'Unauthorized',
      httpStatus: 401,
      message:
        context === 'challenge'
          ? 'Die Sitzung ist abgelaufen. Bitte melde dich erneut an.'
          : 'E-Mail oder Passwort ist falsch.',
    };
  }
  if (e instanceof InvalidPasswordException) {
    const generic = 'Das Passwort erfüllt die Anforderungen nicht.';
    return {
      code: 'InvalidPassword',
      httpStatus: 400,
      message: e.message ? `${generic} ${e.message}` : generic,
    };
  }
  if (e instanceof CodeMismatchException) {
    return {
      code: 'CodeMismatch',
      httpStatus: 400,
      message: 'Der Code ist falsch.',
    };
  }
  if (e instanceof ExpiredCodeException) {
    return {
      code: 'CodeExpired',
      httpStatus: 400,
      message: 'Der Code ist abgelaufen, bitte fordere einen neuen an.',
    };
  }
  if (
    e instanceof LimitExceededException ||
    e instanceof TooManyRequestsException ||
    e instanceof TooManyFailedAttemptsException
  ) {
    return {
      code: 'TooManyRequests',
      httpStatus: 429,
      message: 'Zu viele Versuche, bitte später erneut versuchen.',
    };
  }
  return {
    code: 'InternalServerError',
    httpStatus: 500,
    message: 'Es ist ein unerwarteter Fehler aufgetreten.',
  };
}
