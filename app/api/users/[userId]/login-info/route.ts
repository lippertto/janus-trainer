import { ErrorDto, LoginInfo } from '@/lib/dto';
import { NextRequest, NextResponse } from 'next/server';
import {
  allowAdminOrSelf,
  handleTopLevelCatch,
  notFoundResponse,
} from '@/lib/helpers-for-api';
import {
  createCognitoClient,
  getCognitoUserById,
  listGroupsForUser,
} from '@/app/api/users/cognito';

const client = createCognitoClient();

export async function GET(
  nextRequest: NextRequest,
  params: { userId: string },
): Promise<NextResponse<LoginInfo | ErrorDto>> {
  try {
    await allowAdminOrSelf(nextRequest, params.userId);
    const cognitoUser = await getCognitoUserById(client, params.userId);
    if (!cognitoUser) {
      return notFoundResponse();
    }

    const result: LoginInfo = {
      cognitoId: cognitoUser.username,
      email: cognitoUser.email,
      groups: await listGroupsForUser(client, cognitoUser.username),
      confirmed: cognitoUser.confirmed,
    };

    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
