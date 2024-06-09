import {
  allowOnlyAdmins,
  badRequestResponse,
  emptyResponse,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { DisciplineDto, DisciplineUpdateRequest, ErrorDto } from '@/lib/dto';

async function deleteDiscipline(
  params: { id: string },
) {

  const idAsNumber = parseInt(params.id);
  if (!idAsNumber) return badRequestResponse('id is not valid');

  await prisma.discipline.delete({ where: { id: idAsNumber } });

  return emptyResponse();
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    await allowOnlyAdmins(request);
    return await deleteDiscipline(params);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function updateDiscipline(nextRequest: NextRequest, params: { id: string }) {
  const request = await validateOrThrow(new DisciplineUpdateRequest(
    await nextRequest.json()),
  );
  const value = await prisma.discipline.update({
    where: { id: parseInt(params.id) },
    data: request,
  });
  return NextResponse.json(value);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<DisciplineDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(request);
    return await updateDiscipline(request, params);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
