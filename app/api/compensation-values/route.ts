import { NextRequest, NextResponse } from 'next/server';
import { CompensationValue } from '@prisma/client';
import { allowAnyAuthorized, allowOnlyAdmins, handleTopLevelCatch, validateOrThrow } from '@/lib/helpers-for-api';
import { CompensationValueCreateRequest, CompensationValueQueryResponse, ErrorResponse } from '@/lib/dto';
import prisma from '@/lib/prisma';

async function doGET(request: NextRequest): Promise<NextResponse<CompensationValueQueryResponse>> {
  await allowAnyAuthorized(request);

  const value = await prisma.compensationValue.findMany({ where: {} });
  return NextResponse.json({ value });
}

export async function GET(request: NextRequest,
): Promise<NextResponse<CompensationValueQueryResponse | ErrorResponse>> {
  try {
    return await doGET(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function doPOST(nextRequest: NextRequest) {
  await allowOnlyAdmins(nextRequest);

  const request = await validateOrThrow<CompensationValueCreateRequest>(await nextRequest.json());

  const result = await prisma.compensationValue.create({data: {description: request.description, cents: request.cents}})

  return NextResponse.json(result, {status: 201});
}

export async function POST(request: NextRequest): Promise<NextResponse<CompensationValue|ErrorResponse>> {
  try {
    return await doPOST(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}