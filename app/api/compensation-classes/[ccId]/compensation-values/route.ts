import { NextRequest, NextResponse } from 'next/server';
import {
  allowOnlyAdmins,
  handleTopLevelCatch,
  idAsNumberOrThrow,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import {
  CompensationValueCreateRequest,
  CompensationValueDto,
  CompensationValueUpdateRequest,
  ErrorDto,
} from '@/lib/dto';
import prisma from '@/lib/prisma';

async function createCompensationValue(
  compensationClassId: string,
  request: CompensationValueCreateRequest,
) {
  return prisma.compensationValue.create({
    data: {
      description: request.description,
      cents: request.cents,
      durationMinutes: request.durationMinutes,
      compensationClass: {
        connect: { id: idAsNumberOrThrow(compensationClassId) },
      },
    },
  });
}

export async function POST(
  nextRequest: NextRequest,
  params: {
    params: { ccId: number };
  },
): Promise<NextResponse<CompensationValueDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(nextRequest);
    const request = await validateOrThrow(
      CompensationValueCreateRequest,
      await nextRequest.json(),
    );
    const result = await createCompensationValue(
      params.params.ccId as unknown as string,
      request,
    );
    return NextResponse.json(
      {
        ...result,
        cents: Number(result.cents),
      },
      { status: 201 },
    );
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
