import { NextRequest, NextResponse } from 'next/server';
import { allowOnlyAdmins, validateOrThrow } from '@/lib/helpers-for-api';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { UserCreateRequest } from '@/lib/dto';
import {
  createCognitoClient,
  createCognitoUser,
  enableCognitoUser,
  getUserByEmail,
  ParsedCognitoUser, setGroupsForUser,
} from '@/app/api/users/cognito';

/** Creates a users in cognito and in the database. */
export async function createUser(nextRequest: NextRequest) {
  await allowOnlyAdmins(nextRequest);
  const request = await validateOrThrow<UserCreateRequest>(await nextRequest.json());

  let cognitoUser: ParsedCognitoUser | null;
  if (!process.env.JEST_WORKER_ID) {
    // we skip the cognito communication in unit tests.1
    const client = createCognitoClient();

    cognitoUser = await getUserByEmail(client, request.email);

    if (!cognitoUser) {
      cognitoUser = await createCognitoUser(client, request.email, request.name);
      await setGroupsForUser(client, cognitoUser.username, request.groups)
    } else if (!cognitoUser.enabled) {
      await enableCognitoUser(client, request.email);
      await setGroupsForUser(client, cognitoUser.username, request.groups);
      cognitoUser = {...cognitoUser, enabled: true, groups: request.groups};
    }
  } else {
    cognitoUser = {
      username: uuidv4(),
      email: request.email,
      name: request.name,
      groups: request.groups,
      enabled: true,
    };
  }

  let dbUser = await prisma.userInDb.findFirst({ where: { id: cognitoUser.username } });
  if (dbUser && dbUser.deletedAt) {
    await prisma.userInDb.update({
      where: { id: dbUser.id }, data: {
        deletedAt: null,
      },
    });
  } else {
    dbUser = await prisma.userInDb.create({
      data: {
        id: cognitoUser.username,
        name: request.name,
        iban: request.iban,
        compensationGroups: request.compensationGroups,
      },
    });
  }

  return NextResponse.json(
    {
      ...dbUser,
      groups: cognitoUser.groups,
      email: cognitoUser.email,
    },
    { status: 201 },
  );
}