import {
  allowAnyLoggedIn,
  allowOnlyAdmins,
  emptyResponse,
  handleTopLevelCatch,
  idAsNumberOrThrow,
  validateOrThrowOld,
} from '@/lib/helpers-for-api';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CourseDto, CourseUpdateRequest, ErrorDto } from '@/lib/dto';

async function getOneCourse(id: string) {
  const value = await prisma.course.findUnique({
    where: { id: parseInt(id) },
    include: { trainers: true },
  });
  return NextResponse.json(value);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await allowAnyLoggedIn(request);
    return await getOneCourse(params.id);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function deleteOneCourse(idString: string) {
  const id = idAsNumberOrThrow(idString)
  await prisma.course.delete({ where: { id } });
  return emptyResponse();
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    await allowOnlyAdmins(request);
    return await deleteOneCourse(params.id);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function updateOneCourse(idString: string, data: any) {
  const id = idAsNumberOrThrow(idString);
  const request = await validateOrThrowOld(new CourseUpdateRequest(data));
  return prisma.course.update({
    where: { id },
    data: {
      ...{...request, trainerIds: undefined },

      trainers: {
        set: request.trainerIds.map((t) => ({ id: t })),
      },
    },
    include: { trainers: true }
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse<CourseDto|ErrorDto>> {
  try {
    await allowOnlyAdmins(request);
    const data = await request.json();
    const result = await updateOneCourse(params.id, data);
    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}