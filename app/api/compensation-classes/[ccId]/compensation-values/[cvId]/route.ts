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
    params: Promise<{ ccId: string; cvId: string }>;
  },
): Promise<NextResponse<CompensationValueDto | ErrorDto>> {
  const params = await props.params;
  try {
    await allowAnyLoggedIn(nextRequest);
    const result = await prisma.compensationValue.findUnique({
      where: { id: idAsNumberOrThrow(params.cvId) },
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
    params: Promise<{ ccId: string; cvId: string }>;
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
      where: { id: idAsNumberOrThrow(params.cvId) },
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
  props: { params: Promise<{ ccId: string; cvId: string }> },
): Promise<Response> {
  const params = await props.params;
  try {
    await allowOnlyAdmins(nextRequest);
    await prisma.compensationValue.delete({
      where: { id: idAsNumberOrThrow(params.cvId) },
    });
    return emptyResponse();
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
