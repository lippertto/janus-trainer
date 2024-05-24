import { NextRequest, NextResponse } from 'next/server';
import { allowOnlyAdmins, validateOrThrow } from '@/lib/helpers-for-api';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { UserCreateRequest } from '@/lib/dto';
import { createCognitoClient, createCognitoUser, getUserByEmail, ParsedCognitoUser } from '@/app/api/users/cognito';

/** Creates a users in cognito and in the database. */
export async function createUser(nextRequest: NextRequest) {
  await allowOnlyAdmins(nextRequest);
  const request = await validateOrThrow<UserCreateRequest>(await nextRequest.json());

  let cognitoUser: ParsedCognitoUser|null
  if (!process.env.JEST_WORKER_ID) {
    // we skip the cognito communication in unit tests.1
    const client = createCognitoClient()

    cognitoUser = await getUserByEmail(client, request.email);

    if (!cognitoUser) {
      cognitoUser = await createCognitoUser(
        client,
        request.email,
        request.name,
        request.groups,
      );
    }
  } else {
    cognitoUser = {
      username: uuidv4(),
      email: request.email,
      name: request.name,
      groups: request.groups,
    }
  }

  const dbUser = await prisma.userInDb.create({
    data: {
      id: cognitoUser.username,
      name: request.name,
      iban: request.iban,
    },
  });

  return NextResponse.json(
    {
      id: dbUser.id,
      email: cognitoUser.email,
      name: dbUser.name,
      iban: dbUser.iban,
      groups: cognitoUser.groups,
    },
    { status: 201 },
  );
}