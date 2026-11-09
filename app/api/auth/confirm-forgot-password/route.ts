import { NextRequest, NextResponse } from 'next/server';
import { ConfirmForgotPasswordRequest } from '@/lib/dto';
import {
  ApiErrorBadRequest,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import { confirmPasswordReset, toApiError } from '@/app/api/users/cognito-auth';

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiErrorBadRequest('Request is invalid: body is not JSON');
  }
}

/**
 * Pre-authentication route, intentionally public. Sets a new password with the emailed code. The
 * user is NOT signed in afterwards; the page returns to the sign-in step.
 *
 * Never log or return the reset code or the new password.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await validateOrThrow(
      ConfirmForgotPasswordRequest,
      await readJson(request),
    );
    try {
      await confirmPasswordReset(
        body.email,
        body.confirmationCode,
        body.newPassword,
      );
    } catch (e) {
      throw toApiError(e);
    }
    return NextResponse.json({ status: 'PASSWORD_RESET' });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
