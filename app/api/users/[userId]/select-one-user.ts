import { Group, UserDto } from '@/lib/dto';
import prisma from '@/lib/prisma';
import { ApiErrorNotFound } from '@/lib/helpers-for-api';
import { createCognitoClient } from '@/app/api/users/cognito-client';
import { getCognitoUserById, listGroupsForUser } from '@/app/api/users/cognito';

export async function selectOneUser(
  id: string,
  includeCognitoProperties: boolean,
  includeCompensationValues: boolean,
  includeCompensationClasses: boolean,
): Promise<UserDto> {
  let expand;
  if (includeCompensationClasses) {
    expand = { compensationClasses: true };
  }
  // it's fine if we overwrite this
  if (includeCompensationValues) {
    expand = { compensationClasses: { include: { compensationValues: true } } };
  }

  const dbUser = await prisma.userInDb.findUnique({
    where: { id },
    include: expand,
  });
  if (dbUser === null) {
    throw new ApiErrorNotFound(`User with id ${id} not found`);
  }

  const client = createCognitoClient();

  let email: string = '';
  let groups: Group[] = [];
  if (includeCognitoProperties) {
    const cognitoUser = await getCognitoUserById(client, id);

    if (!cognitoUser) {
      throw new ApiErrorNotFound(`User ${id} does not exist in cognito`);
    }

    email = cognitoUser.email;
    groups = await listGroupsForUser(client, id);
  }

  return {
    ...dbUser,
    email: email,
    groups: groups,
    termsAcceptedAt: dbUser.termsAcceptedAt?.toLocaleDateString() ?? null,
    // @ts-ignore
    compensationClasses: dbUser.compensationClasses ?? [],
  };
}
