import { NextRequest } from 'next/server';
import {
  allowOnlyAdmins,
  emptyResponse,
  handleTopLevelCatch,
  idAsNumberOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { disciplineId: string } },
) {
  try {
    await allowOnlyAdmins(request);
    await prisma.discipline.delete({
      where: { id: idAsNumberOrThrow(params.disciplineId) },
    });
    return emptyResponse();
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
