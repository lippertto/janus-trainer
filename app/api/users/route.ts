import { ErrorResponse } from '@/lib/dto';
import prisma from '@/lib/prisma';
import {
  ApiErrorBadRequest,
  allowOnlyAdmins,
  handleTopLevelCatch,
} from '@/lib/helpers-for-api';
import { User } from '@/lib/dto';
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

async function listUsers(): Promise<User[]> {
  const client = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION ?? 'eu-north-1',
  });

  const allUsers = new Map(
    (await listAllUsers(client)).map((user) => [user.username, user]),
  );
  console.log(`Found ${allUsers.size} users in cognito.`);
  const allGroups = await listGroups(client);
  if (!allGroups) {
    return [];
  }
  console.log(`Found groups: ${JSON.stringify(allGroups)} in cognito`);

  for (const thisGroup of allGroups) {
    const usersIdsInThisGroup = await findUsersForGroup(client, thisGroup);
    usersIdsInThisGroup.forEach((userId) => {
      allUsers.get(userId)!.groups.push(thisGroup as Group);
    });
  }

  const result: User[] = [];
  for (const [username, cognitoUser] of allUsers.entries()) {
    const userInDatabase = await prisma.userInDb.findFirst({
      where: {
        id: username,
        deletedAt: null,
      },
    });
    if (!userInDatabase) continue;
    const userResponse = {
      ...cognitoUser,
      id: username,
      iban: userInDatabase.iban ?? null,
    };
    result.push(userResponse);
  }
  return result;
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<UserQueryResponseDto | ErrorResponse>> {
  try {
    await allowOnlyAdmins(request);

    const value = await listUsers();

    return NextResponse.json({ value });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}


export async function POST(
  nextRequest: NextRequest,
): Promise<NextResponse<User | ErrorResponse>> {
  try {
    return await createUser(nextRequest);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}