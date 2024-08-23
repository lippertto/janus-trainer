import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { DisciplineCreateRequest, DisciplineDto, DisciplineQueryResponseDto, ErrorDto } from '@/lib/dto';
import { allowAnyLoggedIn, allowOnlyAdmins, handleTopLevelCatch, validateOrThrowOld } from '@/lib/helpers-for-api';

async function getAllDisciplines() {
  const result =  await prisma.discipline.findMany({where:{}})
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

async function createDiscipline(body: any) {
  const request =  await validateOrThrowOld<DisciplineCreateRequest>(new DisciplineCreateRequest(body));

  const result = await prisma.discipline.create({ data: request });

  return NextResponse.json(result, { status: 201 });
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<DisciplineDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(request);

    return await createDiscipline(await request.json());
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
