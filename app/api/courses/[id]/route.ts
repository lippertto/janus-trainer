import {
  allowAnyLoggedIn,
  allowOnlyAdmins,
  ApiErrorNotFound,
  emptyResponse,
  getOwnUserId,
  handleTopLevelCatch,
  idAsNumberOrThrow,
  notFoundResponse,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { CourseDto, CourseUpdateRequest, ErrorDto } from '@/lib/dto';
import { logger } from '@/lib/logging';

async function getOneCourse(id: number): Promise<CourseDto | null> {
  const value = await prisma.course.findUnique({
    where: { id, deletedAt: null },
    include: { trainers: true },
  });
  if (!value) {
    return null;
  }
  return value;
}

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    await allowAnyLoggedIn(request);
    const id = idAsNumberOrThrow(params.id);
    const course = await getOneCourse(id);
    if (!course) return notFoundResponse();
    return NextResponse.json(course);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function deleteOneCourse(idString: string) {
  const id = idAsNumberOrThrow(idString);

  const course = await getOneCourse(id);
  if (!course) return emptyResponse();

  await prisma.course.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return emptyResponse();
}

export async function DELETE(
  request: NextRequest,
  props: { params: Promise<{ id: string }> },
) {
  const params = await props.params;
  try {
    await allowOnlyAdmins(request);
    return await deleteOneCourse(params.id);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function updateOneCourse(idString: string, request: CourseUpdateRequest) {
  const id = idAsNumberOrThrow(idString);
  const course = await prisma.course.findUnique({ where: { id } });
  if (!course) throw new ApiErrorNotFound('Could not find course');

  return prisma.course.update({
    where: { id },
    data: {
      ...{ ...request, trainerIds: undefined },

      trainers: {
        set: request.trainerIds.map((t) => ({ id: t })),
      },
    },
    include: { trainers: true },
  });
}

export async function PUT(
  nextRequest: NextRequest,
  props: { params: Promise<{ id: string }> },
): Promise<NextResponse<CourseDto | ErrorDto>> {
  const params = await props.params;
  try {
    await allowOnlyAdmins(nextRequest);
    const userId = await getOwnUserId(nextRequest);
    logger.info({ userId }, `Updating course ${params.id}`);

    const updateRequest = await validateOrThrow(
      CourseUpdateRequest,
      await nextRequest.json(),
    );

    const result = await updateOneCourse(params.id, updateRequest);
    return NextResponse.json(result);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
