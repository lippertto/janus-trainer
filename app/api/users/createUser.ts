import prisma from '@/lib/prisma';
import { UserCreateRequest, UserDto } from '@/lib/dto';
import {
  createCognitoClient,
  createCognitoUser,
  enableCognitoUser,
  getUserByEmail,
  setGroupsForUser,
} from '@/app/api/users/cognito';

/** Creates a users in cognito and in the database. */
export async function createUser(request: UserCreateRequest): Promise<UserDto> {

  const client = createCognitoClient();

  let cognitoUser = await getUserByEmail(client, request.email);
  if (!cognitoUser) {
    cognitoUser = await createCognitoUser(client, request.email, request.name);
    cognitoUser.groups = await setGroupsForUser(client, cognitoUser.username, request.groups);
  } else if (!cognitoUser.enabled) {
    await enableCognitoUser(client, request.email);
    cognitoUser.enabled = true;
    cognitoUser.groups = await setGroupsForUser(client, cognitoUser.username, request.groups);
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
        compensationClasses: {
          connect: request.compensationClassIds.map((ccId) => ({id: ccId}))
        }
      },
      include: {compensationClasses: true}
    }
    );
  }

  return {
    ...dbUser,
      groups: cognitoUser.groups,
      email: cognitoUser.email,
      termsAcceptedAt: dbUser.termsAcceptedAt?.toLocaleDateString() ?? null,
      // @ts-expect-error
      compensationClasses: dbUser.compensationClasses ?? []
    }
}