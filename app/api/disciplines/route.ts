import { DisciplineCreateRequest, ErrorDto } from '@/lib/dto';
import prisma from '@/lib/prisma';
import {
  allowAnyLoggedIn,
  allowOnlyAdmins,
  handleTopLevelCatch, validateOrThrow,
} from '@/lib/helpers-for-api';
import { Discipline, Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

export type DisciplineQueryResult = {
  value: Discipline[];
};

async function doGET(request: NextRequest) {
  allowAnyLoggedIn(request);

  const result = await prisma.discipline.findMany();
  return NextResponse.json({ value: result });
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<DisciplineQueryResult | ErrorDto>> {
  try {
    return await doGET(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function doPOST(request: NextRequest) {
  await allowOnlyAdmins(request);

  const body = await request.json();
  const req = await validateOrThrow(new DisciplineCreateRequest(body));

  const discipline = await prisma.discipline.create({ data: req });

  return NextResponse.json(discipline, { status: 201 });
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<Discipline | ErrorDto>> {
  try {
    return await doPOST(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
