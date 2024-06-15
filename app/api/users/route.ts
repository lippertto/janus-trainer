import { ErrorDto } from '@/lib/dto';
import prisma from '@/lib/prisma';
import {
  allowOnlyAdmins,
  handleTopLevelCatch,
} from '@/lib/helpers-for-api';
import { UserDto } from '@/lib/dto';
import { Group } from '@/lib/dto';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';


import { NextRequest, NextResponse } from 'next/server';
import {
  findUsersForGroup,
  listAllUsers,
  listGroups,
} from './cognito';
import { UserQueryResponseDto } from '@/lib/dto';
import { createUser } from '@/app/api/users/createUser';

/** List all users.
 * Only the following users are returned:
 * * User exists in the database and is not soft-deleted
 * * User exists in cognito as is enabled
 */
async function listUsers(request: NextRequest): Promise<UserDto[]> {
  const client = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION ?? 'eu-north-1',
  });

  const allUsers = new Map(
    (await listAllUsers(client)).map((user) => [user.username, user]),
  );

  let groupsToAnnotate: string[];
  const groupFilter = request.nextUrl.searchParams.get('group');
  if (groupFilter) {
    groupsToAnnotate = [groupFilter]
  } else {
    groupsToAnnotate = await listGroups(client);
  }

  for (const thisGroup of groupsToAnnotate) {
    const usersIdsInThisGroup = await findUsersForGroup(client, thisGroup);
    usersIdsInThisGroup.forEach((userId) => {
      allUsers.get(userId)!.groups.push(thisGroup as Group);
    });
  }

  // if a group filter has been set, filter all users which do not have groups
  // (because of the way we annotate groups above, only users with matching
  // groups have the group property set
  if (groupFilter) {
    for (let [userId, user] of allUsers) {
      if (user.groups.length === 0) {
        allUsers.delete(userId);
      }
    }
  }

  const result: UserDto[] = [];
  for (const [username, cognitoUser] of allUsers.entries()) {
    const userInDatabase = await prisma.userInDb.findFirst({
      where: {
        id: username,
        deletedAt: null,
      },
    });
    if (!userInDatabase) continue;
    const userResponse = {
      ...userInDatabase,
      email: cognitoUser.email,
      groups: cognitoUser.groups,
      iban: userInDatabase.iban ?? null,
    };
    result.push(userResponse);
  }
  return result;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<UserQueryResponseDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(request);

    const value = await listUsers(request);

    return NextResponse.json({ value });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}


export async function POST(
  nextRequest: NextRequest,
): Promise<NextResponse<UserDto | ErrorDto>> {
  try {
    return await createUser(nextRequest);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
