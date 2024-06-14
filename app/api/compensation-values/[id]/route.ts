import { allowOnlyAdmins, emptyResponse, handleTopLevelCatch, idAsNumberOrThrow } from '@/lib/helpers-for-api';
import { badRequestResponse } from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';

async function deleteCompensationValue(
  params: { id: string },
) {
  const idAsNumber = idAsNumberOrThrow(params.id);

  await prisma.compensationValue.delete({ where: { id: idAsNumber } });

  return emptyResponse();
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    await allowOnlyAdmins(request);
    return await deleteCompensationValue(params)
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}