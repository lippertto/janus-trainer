import { allowOnlyAdmins, handleTopLevelCatch } from '@/lib/helpers-for-api';
import { badRequestResponse } from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { NextRequest } from 'next/server';

async function doDELETE(
  request: NextRequest,
  params: { id: string },
) {
  await allowOnlyAdmins(request);

  const idAsNumber = parseInt(params.id);
  if (!idAsNumber) return badRequestResponse('id is not valid');

  await prisma.discipline.delete({ where: { id: idAsNumber } });

  return new Response(null, { status: 204 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    return await doDELETE(request, params)
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}