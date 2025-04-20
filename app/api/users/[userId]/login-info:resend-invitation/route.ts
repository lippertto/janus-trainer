import { NextRequest, NextResponse } from 'next/server';
import { ErrorDto } from '@/lib/dto';
import {
  allowOnlyAdmins,
  getOwnUserId,
  handleTopLevelCatch,
} from '@/lib/helpers-for-api';
import { resendInvitationEmail } from '@/app/api/users/cognito';
import { logger } from '@/lib/logging';
import { cognitoClient } from '@/app/api/users/cognito-client';

export async function POST(
  nextRequest: NextRequest,
  props: { params: Promise<{ userId: string }> },
): Promise<NextResponse<{ result: 'success' } | ErrorDto>> {
  const params = await props.params;
  try {
    await allowOnlyAdmins(nextRequest);
    const userId = await getOwnUserId(nextRequest);

    logger.info(
      { userId, accountId: params.userId },
      `User ${userId} re-sent invitation for account ${params.userId}`,
    );

    await resendInvitationEmail(cognitoClient(), params.userId);
    return NextResponse.json({ result: 'success' });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
