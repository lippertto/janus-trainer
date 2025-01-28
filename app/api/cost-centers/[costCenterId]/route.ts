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
  props: { params: Promise<{ costCenterId: string }> },
) {
  const params = await props.params;
  try {
    await allowOnlyAdmins(request);
    await prisma.discipline.delete({
      where: { id: idAsNumberOrThrow(params.costCenterId) },
    });
    return emptyResponse();
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
