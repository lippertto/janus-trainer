import { ErrorDto, LoginInfo } from '@/lib/dto';
import { NextRequest, NextResponse } from 'next/server';
import {
  allowAdminOrSelf,
  handleTopLevelCatch,
  notFoundResponse,
} from '@/lib/helpers-for-api';
import { getCognitoUserById, listGroupsForUser } from '@/app/api/users/cognito';
import { cognitoClient } from '@/app/api/users/cognito-client';

export async function GET(
  nextRequest: NextRequest,
  props: { params: Promise<{ userId: string }> },
): Promise<NextResponse<LoginInfo | ErrorDto>> {
  const params = await props.params;
  try {
    await allowAdminOrSelf(nextRequest, params.userId);
    const cognitoUser = await getCognitoUserById(
      cognitoClient(),
      params.userId,
    );
    if (!cognitoUser) {
      return notFoundResponse();
    }

    const result: LoginInfo = {
      cognitoId: cognitoUser.username,
      email: cognitoUser.email,
      groups: await listGroupsForUser(cognitoClient(), cognitoUser.username),
      confirmed: cognitoUser.confirmed,
    };

    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
