import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  DisciplineCreateRequest,
  DisciplineDto,
  DisciplineQueryResponseDto,
  ErrorDto,
} from '@/lib/dto';
import {
  allowAnyLoggedIn,
  allowOnlyAdmins,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';

async function getAllDisciplines() {
  const result = await prisma.discipline.findMany({ where: {} });
  return NextResponse.json({ value: result });
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<DisciplineQueryResponseDto | ErrorDto>> {
  try {
    await allowAnyLoggedIn(request);
    return await getAllDisciplines();
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function POST(
  nextRequest: NextRequest,
): Promise<NextResponse<DisciplineDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(nextRequest);
    const request = await validateOrThrow(
      DisciplineCreateRequest,
      await nextRequest.json(),
    );

    const result = await prisma.discipline.create({ data: request });

    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
