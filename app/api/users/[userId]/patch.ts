import { UserPatchRequest } from '@/lib/dto';
import prisma from '@/lib/prisma';
import { ApiErrorNotFound, validateOrThrow } from '@/lib/helpers-for-api';

export function patchRequestToUpdateData(request: UserPatchRequest) {
  let data: any = {};
  if (request.iban) {
    data['iban'] = request.iban.replace(/\s/g, '');
  }
  if (request.termsAcceptedVersion) {
    data['termsAcceptedVersion'] = request.termsAcceptedVersion;
    data['termsAcceptedAt'] = new Date();
  }
  return data;
}

export async function patchOneUser(id: string, request: UserPatchRequest) {
  const dbUser = await prisma.userInDb.findUnique({
    where: { id },
  });
  if (dbUser === null) {
    throw new ApiErrorNotFound(`User with id ${id} not found`);
  }
  const updateData = patchRequestToUpdateData(request);

  return prisma.userInDb.update({
    where: { id },
    data: updateData,
  });
}
