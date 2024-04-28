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

import { Prisma } from '@prisma/client';
import { validate } from 'class-validator';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import {
  createCognitoUser,
  findUsersForGroup,
  listAllUsers,
  listGroups,
} from './cognito';
import { UserCreateRequest, UserQueryResponseDto } from '@/lib/dto';

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

async function validateCreateRequest(
  incomingRequest: any,
): Promise<UserCreateRequest> {
  const request = new UserCreateRequest(incomingRequest);
  const validationErrors = await validate(request);
  if (validationErrors.length !== 0) {
    throw new ApiErrorBadRequest(
      'Request to create user is invalid.' + JSON.stringify(validationErrors),
    );
  }

  if (request.groups.indexOf(Group.TRAINERS) !== -1 && !request.iban) {
    throw new ApiErrorBadRequest(
      "To assign the role 'trainer', an IBAN has to be provided.",
    );
  }
  return request;
}

async function doPOST(nextRequest: NextRequest) {
  await allowOnlyAdmins(nextRequest);

  const incomingRequest = await nextRequest.json();
  const request = await validateCreateRequest(incomingRequest);

  // in a test scenario we do not want to write to cognito
  if (process.env.JEST_WORKER_ID) {
    const username = uuidv4();
    const createdUser = await prisma.userInDb.create({
      data: { ...request, id: username } as Prisma.UserInDbCreateInput,
    });
    return NextResponse.json(
      {
        id: createdUser.id,
        iban: createdUser.iban,
        groups: request.groups as Group[],
        email: request.email,
        name: createdUser.name,
      },
      { status: 201 },
    );
  }

  const client = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION ?? 'eu-north-1',
  });
  const cognitoUser = await createCognitoUser(
    client,
    request.email,
    request.name,
    request.groups,
  );

  const createdUser = await prisma.userInDb.create({
    data: {
      id: cognitoUser.username,
      name: request.name,
      iban: request.iban,
    },
  });

  return NextResponse.json(
    {
      id: createdUser.id,
      email: request.email,
      name: createdUser.name,
      iban: createdUser.iban,
      groups: cognitoUser.groups,
    },
    { status: 201 },
  );
}

export async function POST(
  nextRequest: NextRequest,
): Promise<NextResponse<User | ErrorResponse>> {
  try {
    return await doPOST(nextRequest);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
