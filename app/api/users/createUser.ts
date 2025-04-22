import prisma from '@/lib/prisma';
import { UserCreateRequest, UserDto } from '@/lib/dto';
import {
  createCognitoUser,
  enableCognitoUser,
  getUserByEmail,
  setGroupsForUser,
} from '@/app/api/users/cognito';
import { cognitoClient } from '@/app/api/users/cognito-client';
import { ApiErrorBadRequest } from '@/lib/helpers-for-api';

/** Creates a users in cognito and in the database. */
export async function createUser(request: UserCreateRequest): Promise<UserDto> {
  if (/[\u200B\u200C\u200D\u2060\uFEFF]/.test(request.name)) {
    throw new ApiErrorBadRequest('Zero-width whitespace is not allowed');
  }
  const client = cognitoClient();

  let cognitoUser = await getUserByEmail(client, request.email);
  if (!cognitoUser) {
    cognitoUser = await createCognitoUser(
      client,
      request.email,
      request.name,
      false,
    );
    cognitoUser.groups = await setGroupsForUser(
      client,
      cognitoUser.username,
      request.groups,
    );
  } else if (!cognitoUser.enabled) {
    await enableCognitoUser(client, request.email);
    cognitoUser.enabled = true;
    cognitoUser.groups = await setGroupsForUser(
      client,
      cognitoUser.username,
      request.groups,
    );
  }

  let dbUser = await prisma.userInDb.findFirst({
    where: { id: cognitoUser.username },
  });
  if (dbUser && dbUser.deletedAt) {
    await prisma.userInDb.update({
      where: { id: dbUser.id },
      data: {
        deletedAt: null,
      },
    });
  } else {
    dbUser = await prisma.userInDb.create({
      data: {
        id: cognitoUser.username,
        name: request.name,
        email: request.email,
        iban: request.iban,
        compensationClasses: {
          connect: request.compensationClassIds.map((ccId) => ({ id: ccId })),
        },
      },
      include: { compensationClasses: true },
    });
  }

  return {
    ...dbUser,
    groups: cognitoUser.groups,
    email: cognitoUser.email,
    termsAcceptedAt: dbUser.termsAcceptedAt?.toLocaleDateString() ?? null,
    // @ts-expect-error
    compensationClasses: dbUser.compensationClasses ?? [],
  };
}
