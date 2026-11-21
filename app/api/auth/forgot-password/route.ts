import { NextRequest, NextResponse } from 'next/server';
import { ForgotPasswordRequest } from '@/lib/dto';
import {
  ApiErrorBadRequest,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import { requestPasswordReset, toApiError } from '@/app/api/users/cognito-auth';

async function readJson(request: NextRequest): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiErrorBadRequest('Request is invalid: body is not JSON');
  }
}

/**
 * Pre-authentication route, intentionally public. Always answers CODE_SENT, whether or not the
 * account exists (spec FR-008); only genuine infrastructure failures are reported.
 *
 * Never log or return the email, the reset code or Cognito's delivery details.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await validateOrThrow(
      ForgotPasswordRequest,
      await readJson(request),
    );
    try {
      await requestPasswordReset(body.email);
    } catch (e) {
      throw toApiError(e);
    }
    return NextResponse.json({ status: 'CODE_SENT' });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
