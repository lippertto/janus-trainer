import {
  allowOnlyAdmins,
  emptyResponse,
  handleTopLevelCatch,
  idAsNumberOrThrow,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { CompensationValueDto, CompensationValueUpdateRequest, ErrorDto } from '@/lib/dto';

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
    return await deleteCompensationValue(params);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}


async function updateCompensationValue(idString: string, data: any) {
  const id = idAsNumberOrThrow(idString);
  const request = await validateOrThrow(new CompensationValueUpdateRequest(data));
  return prisma.compensationValue.update({
    where: { id },
    data: {
      ...request,
    },
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<CompensationValueDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(request);
    const result = await updateCompensationValue(params.id, await request.json());
    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
