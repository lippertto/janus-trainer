import { NextRequest, NextResponse } from 'next/server';
import { allowAnyLoggedIn, allowOnlyAdmins, handleTopLevelCatch, validateOrThrow } from '@/lib/helpers-for-api';
import {
  CompensationValueCreateRequest,
  CompensationValueDto,
  CompensationValueQueryResponse,
  ErrorDto,
} from '@/lib/dto';
import prisma from '@/lib/prisma';
import { CompensationGroup } from '@prisma/client';

async function getAllCompensations(): Promise<NextResponse<CompensationValueQueryResponse>> {
  const value = await prisma.compensationValue.findMany({ where: {} });
  return NextResponse.json({ value });
}

export async function GET(request: NextRequest,
): Promise<NextResponse<CompensationValueQueryResponse | ErrorDto>> {
  try {
    await allowAnyLoggedIn(request);
    return await getAllCompensations();
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function createCompensationValue(nextRequest: NextRequest) {
  const request = await validateOrThrow<CompensationValueCreateRequest>(await nextRequest.json());

  const result = await prisma.compensationValue.create({
    data: {
      description: request.description,
      cents: request.cents,
      compensationGroup: request.compensationGroup,
      durationMinutes: request.durationMinutes,
    },
  });

  return NextResponse.json(result, { status: 201 });
}

export async function POST(request: NextRequest): Promise<NextResponse<CompensationValueDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(request);
    return await createCompensationValue(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}