import { NextRequest, NextResponse } from 'next/server';
import {
  allowAnyLoggedIn,
  allowOnlyAdmins,
  emptyResponse,
  handleTopLevelCatch,
  idAsNumberOrThrow,
  notFoundResponse,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import {
  CompensationValueDto,
  CompensationValueUpdateRequest,
  ErrorDto,
} from '@/lib/dto';
import prisma from '@/lib/prisma';

export async function GET(
  nextRequest: NextRequest,
  props: {
    params: Promise<{ cvId: number }>;
  },
): Promise<NextResponse<CompensationValueDto | ErrorDto>> {
  const params = await props.params;
  try {
    await allowAnyLoggedIn(nextRequest);
    const result = await prisma.compensationValue.findUnique({
      where: { id: idAsNumberOrThrow(params.cvId as unknown as string) },
    });
    if (!result) {
      return notFoundResponse();
    }
    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function PUT(
  nextRequest: NextRequest,
  props: {
    params: Promise<{ cvId: number }>;
  },
): Promise<NextResponse<CompensationValueDto | ErrorDto>> {
  const params = await props.params;
  try {
    await allowOnlyAdmins(nextRequest);
    const request = await validateOrThrow(
      CompensationValueUpdateRequest,
      await nextRequest.json(),
    );
    const result = await prisma.compensationValue.update({
      where: { id: idAsNumberOrThrow(params.cvId as unknown as string) },
      data: {
        ...request,
      },
    });
    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function DELETE(
  nextRequest: NextRequest,
  props: { params: Promise<{ cvId: number }> },
): Promise<Response> {
  const params = await props.params;
  try {
    await allowOnlyAdmins(nextRequest);
    await prisma.compensationValue.delete({
      where: { id: idAsNumberOrThrow(params.cvId as unknown as string) },
    });
    return emptyResponse();
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
