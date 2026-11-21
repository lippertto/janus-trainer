import { NextRequest, NextResponse } from 'next/server';
import { RespondToNewPasswordChallengeRequest } from '@/lib/dto';
import {
  ApiErrorBadRequest,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import {
  respondToNewPasswordChallenge,
  toApiError,
} from '@/app/api/users/cognito-auth';
import { createLoginTicket } from '@/lib/login-ticket';

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiErrorBadRequest('Request is invalid: body is not JSON');
  }
}

/**
 * Pre-authentication route, intentionally public. Completes the first-login password change.
 * Like sign-in, it returns only an encrypted, 60 s login ticket, never Cognito tokens.
 *
 * The backend-user check (checkIfUserExists) is NOT done here. It is enforced once, in the
 * signIn callback in lib/auth.ts.
 *
 * Never log or return the new password, tokens, the ticket or the Cognito session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await validateOrThrow(
      RespondToNewPasswordChallengeRequest,
      await readJson(request),
    );

    let tokens;
    try {
      tokens = await respondToNewPasswordChallenge(
        body.challengeUsername,
        body.newPassword,
        body.session,
      );
    } catch (e) {
      throw toApiError(e, 'challenge');
    }

    let ticket;
    try {
      ticket = await createLoginTicket({
        ...tokens.claims,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      });
    } catch (e) {
      // e.g. NEXTAUTH_SECRET is not set. handleTopLevelCatch would return a plain Error's
      // message to the caller, so convert it to a generic error first.
      throw toApiError(e);
    }
    return NextResponse.json({ status: 'SUCCESS', ticket });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
