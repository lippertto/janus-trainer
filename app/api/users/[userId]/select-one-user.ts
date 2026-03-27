import { Group, UserDto } from '@/lib/dto';
import prisma from '@/lib/prisma';
import { ApiErrorNotFound } from '@/lib/helpers-for-api';

export async function selectOneUser(
  id: string,
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

  let email: string = '';

  return {
    ...dbUser,
    email: email,
    termsAcceptedAt: dbUser.termsAcceptedAt?.toLocaleDateString() ?? null,
    groups: [],
    // @ts-ignore
    compensationClasses: dbUser.compensationClasses ?? [],
  };
}
