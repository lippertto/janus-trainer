import {
  CodeMismatchException,
  CognitoIdentityProviderServiceException,
  InitiateAuthCommand,
  ExpiredCodeException,
  InvalidPasswordException,
  LimitExceededException,
  RespondToAuthChallengeCommand,
  NotAuthorizedException,
  TooManyFailedAttemptsException,
  TooManyRequestsException,
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from '@/app/api/users/cognito-client';
import { ApiError } from '@/lib/helpers-for-api';
import { logger } from '@/lib/logging';

/**
 * An error raised by this module itself. Its message is a fixed text (never built from a
 * password, token, session or reset code), so it is safe to log in full. Errors from the AWS SDK
 * and everything else are NOT safe and are logged by type only.
 */
export class CognitoAuthFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CognitoAuthFlowError';
    Object.setPrototypeOf(this, CognitoAuthFlowError.prototype);
  }
}

/** Fails early, with a message that names the missing setting, if the environment is incomplete. */
export function assertCognitoConfigured(): void {
  if (!process.env.COGNITO_CLIENT_ID) {
    throw new CognitoAuthFlowError('COGNITO_CLIENT_ID is not set');
  }
  if (!process.env.AWS_REGION && !process.env.COGNITO_REGION) {
    throw new CognitoAuthFlowError(
      'Neither AWS_REGION nor COGNITO_REGION is set',
    );
  }
}

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

export type IdTokenClaims = {
  sub: string;
  email: string;
  name: string;
  groups: string[];
};

/**
 * Reads the claims of an ID token WITHOUT verifying its signature.
 *
 * This is only acceptable for tokens that this server has just received from Cognito over TLS
 * (the SDK response). Never use it for tokens that came from a browser.
 * See specs/003-custom-login-page/research.md, Decision 3.
 *
 * The error message deliberately does not contain the token.
 */
export function decodeIdToken(idToken: string): IdTokenClaims {
  let claims: Record<string, unknown>;
  try {
    const payload = idToken.split('.')[1];
    claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));
  } catch {
    throw new CognitoAuthFlowError('Could not decode ID token');
  }
  if (typeof claims?.sub !== 'string') {
    throw new CognitoAuthFlowError('ID token does not contain a sub claim');
  }
  const groups = claims['cognito:groups'];
  return {
    sub: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : '',
    name: typeof claims.name === 'string' ? claims.name : '',
    groups: Array.isArray(groups)
      ? groups.filter((g): g is string => typeof g === 'string')
      : [],
  };
}

/** A description of an error that is safe to log: never contains data from the request. */
function describe(e: unknown): string {
  if (e instanceof CognitoAuthFlowError) return `${e.name}: ${e.message}`;
  if (e instanceof CognitoIdentityProviderServiceException) {
    // The message of an SDK exception comes from the service; log only the type and status.
    return `${e.name} (HTTP ${e.$metadata?.httpStatusCode ?? 'unknown'})`;
  }
  return e instanceof Error ? e.name : typeof e;
}

/**
 * Converts anything thrown by a Cognito call into an ApiError with a safe, German message.
 *
 * Routes must pass errors through this before they reach handleTopLevelCatch(), because that
 * function logs the message of plain Errors, and we never want Cognito error text (or anything
 * else that could carry credentials) in the logs. Only the error type is logged here, and only
 * for unexpected failures.
 */
export function toApiError(
  e: unknown,
  context: CognitoErrorContext = 'sign-in',
): ApiError {
  if (e instanceof ApiError) return e;
  const mapped = mapCognitoErrorToUserMessage(e, context);
  if (mapped.httpStatus === 500) {
    logger.warn(`Unexpected error during a Cognito auth call: ${describe(e)}`);
  }
  return new ApiError(mapped.message, mapped.code, mapped.httpStatus);
}

/** What the routes need to build a login ticket. Never send this to the browser. */
export type AuthenticatedTokens = {
  claims: IdTokenClaims;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

export type SignInResult =
  | ({ status: 'SUCCESS' } & AuthenticatedTokens)
  | {
      status: 'CHALLENGE';
      challengeName: 'NEW_PASSWORD_REQUIRED';
      session: string;
      challengeUsername: string;
    };

/** Turns Cognito's AuthenticationResult into the internal shape. Throws if it is incomplete. */
export function toAuthenticatedTokens(
  result:
    | {
        AccessToken?: string;
        RefreshToken?: string;
        IdToken?: string;
        ExpiresIn?: number;
      }
    | undefined,
): AuthenticatedTokens {
  if (
    !result?.AccessToken ||
    !result.RefreshToken ||
    !result.IdToken ||
    !result.ExpiresIn
  ) {
    throw new CognitoAuthFlowError(
      'Cognito returned an incomplete authentication result',
    );
  }
  return {
    claims: decodeIdToken(result.IdToken),
    accessToken: result.AccessToken,
    refreshToken: result.RefreshToken,
    expiresIn: result.ExpiresIn,
  };
}

/**
 * Signs in with email and password (USER_PASSWORD_AUTH). The pool uses the email as the username
 * and the app client has no secret, so no SECRET_HASH is needed.
 */
export async function initiateUserPasswordAuth(
  email: string,
  password: string,
): Promise<SignInResult> {
  assertCognitoConfigured();
  const response = await cognitoClient().send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID!,
      AuthParameters: { USERNAME: email, PASSWORD: password },
    }),
  );

  if (response.ChallengeName === 'NEW_PASSWORD_REQUIRED') {
    const challengeUsername = response.ChallengeParameters?.USER_ID_FOR_SRP;
    if (!response.Session || !challengeUsername) {
      throw new CognitoAuthFlowError(
        'Cognito returned an incomplete challenge',
      );
    }
    return {
      status: 'CHALLENGE',
      challengeName: 'NEW_PASSWORD_REQUIRED',
      session: response.Session,
      challengeUsername,
    };
  }
  if (response.ChallengeName) {
    // e.g. MFA, which is not configured on the pool
    throw new CognitoAuthFlowError(
      `Unsupported challenge: ${response.ChallengeName}`,
    );
  }

  return {
    status: 'SUCCESS',
    ...toAuthenticatedTokens(response.AuthenticationResult),
  };
}

/**
 * Completes the NEW_PASSWORD_REQUIRED challenge (first login with a temporary password).
 *
 * `username` must be the challengeUsername that Cognito returned from the sign-in call
 * (USER_ID_FOR_SRP), not the email the user typed.
 *
 * No `requiredAttributes` are sent: the user pool defines no custom schema, so the only required
 * attribute is the email, which AdminCreateUser already sets. If the pool ever gets more required
 * attributes, Cognito answers with an InvalidParameterException and they would have to be added
 * here (see ChallengeParameters.requiredAttributes of the sign-in response).
 */
export async function respondToNewPasswordChallenge(
  username: string,
  newPassword: string,
  session: string,
): Promise<AuthenticatedTokens> {
  assertCognitoConfigured();
  const response = await cognitoClient().send(
    new RespondToAuthChallengeCommand({
      ChallengeName: 'NEW_PASSWORD_REQUIRED',
      ClientId: process.env.COGNITO_CLIENT_ID!,
      Session: session,
      ChallengeResponses: { USERNAME: username, NEW_PASSWORD: newPassword },
    }),
  );
  if (response.ChallengeName) {
    throw new CognitoAuthFlowError(
      `Unsupported challenge: ${response.ChallengeName}`,
    );
  }
  return toAuthenticatedTokens(response.AuthenticationResult);
}
