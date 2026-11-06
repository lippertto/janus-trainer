import { NextRequest, NextResponse } from 'next/server';
import { SignInRequest } from '@/lib/dto';
import {
  ApiErrorBadRequest,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import {
  initiateUserPasswordAuth,
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
 * Pre-authentication route, intentionally public. Cognito tokens never leave the server: on
 * success the response carries only an encrypted, 60 s login ticket.
 *
 * The backend-user check (checkIfUserExists) is NOT done here. It is enforced once, in the
 * signIn callback in lib/auth.ts.
 *
 * Never log or return the password, tokens, the ticket or the Cognito session.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await validateOrThrow(SignInRequest, await readJson(request));

    let result;
    try {
      result = await initiateUserPasswordAuth(body.email, body.password);
    } catch (e) {
      throw toApiError(e, 'sign-in');
    }

    if (result.status === 'CHALLENGE') {
      return NextResponse.json({
        status: 'CHALLENGE',
        challengeName: result.challengeName,
        session: result.session,
        challengeUsername: result.challengeUsername,
      });
    }

    const ticket = await createLoginTicket({
      ...result.claims,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    });
    return NextResponse.json({ status: 'SUCCESS', ticket });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
