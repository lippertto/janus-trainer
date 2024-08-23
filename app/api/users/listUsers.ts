import { NextRequest } from 'next/server';
import { Group, UserDto } from '@/lib/dto';
import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { findUsersForGroup, listAllUsers, listGroups } from '@/app/api/users/cognito';
import prisma from '@/lib/prisma';

/** List all users.
 * Only the following users are returned:
 * * User exists in the database and is not soft-deleted
 * * User exists in cognito as is enabled
 */
export async function listUsers(request: NextRequest): Promise<UserDto[]> {
  const client = new CognitoIdentityProviderClient({
    region: process.env.COGNITO_REGION ?? 'eu-north-1',
  });

  const allUsers = new Map(
    (await listAllUsers(client)).map((user) => [user.username, user]),
  );

  let groupsToAnnotate: string[];
  const groupFilter = request.nextUrl.searchParams.get('group');
  if (groupFilter) {
    groupsToAnnotate = [groupFilter];
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
      include: { compensationClasses: true },
    });
    if (!userInDatabase) continue;
    const userResponse = {
      ...userInDatabase,
      email: cognitoUser.email,
      groups: cognitoUser.groups,
      compensationClasses: userInDatabase.compensationClasses,
      iban: userInDatabase.iban ?? null,
      termsAcceptedAt: userInDatabase.termsAcceptedAt?.toLocaleDateString() ?? null,
    };
    result.push(userResponse);
  }
  return result;
}