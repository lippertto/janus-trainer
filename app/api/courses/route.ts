import { NextRequest, NextResponse } from 'next/server';
import { Course } from '@prisma/client';
import {
  CourseCreateRequest,
  CourseDto,
  CourseQueryResponse,
  ErrorDto,
} from '@/lib/dto';
import {
  allowAnyLoggedIn,
  allowOnlyAdmins,
  badRequestResponse,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';

async function createCourse(nextRequest: NextRequest) {
  const request: CourseCreateRequest = await validateOrThrow(
    CourseCreateRequest,
    await nextRequest.json(),
  );

  const course = await prisma.course.create({
    data: {
      name: request.name,
      startHour: request.startHour,
      startMinute: request.startMinute,
      durationMinutes: request.durationMinutes,
      weekday: request.weekday,
      trainers: {
        connect: request.trainerIds.map((t) => ({ id: t })),
      },
      costCenterId: request.costCenterId,
    },
    include: { trainers: true },
  });

  return NextResponse.json(course, { status: 201 });
}

export async function POST(
  nextRequest: NextRequest,
): Promise<NextResponse<Course | ErrorDto>> {
  try {
    await allowOnlyAdmins(nextRequest);

    return await createCourse(nextRequest);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function getAllCourses(
  trainerId: string | null,
  includeDeleted: boolean,
  costCenterId: number | null,
): Promise<CourseDto[]> {
  let filter;
  if (includeDeleted) {
    filter = {};
  } else {
    filter = { deletedAt: null };
  }
  if (costCenterId) {
    filter = { ...filter, costCenterId };
  }

  if (trainerId) {
    filter = {
      ...filter,
      trainers: {
        some: { id: trainerId },
      },
    };
  }

  return prisma.course.findMany({
    where: filter,
    include: { trainers: true },
  });
}

async function getCustomCourses(costCenterId?: number): Promise<CourseDto[]> {
  const value = await prisma.course.findMany({
    where: {
      isCustomCourse: true,
      costCenterId,
    },
  });
  return value.map((c) => ({ ...c, trainers: [] }));
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<CourseQueryResponse | ErrorDto>> {
  try {
    await allowAnyLoggedIn(request);

    const trainerId = request.nextUrl.searchParams.get('trainerId');
    const customCourse = request.nextUrl.searchParams.get('custom') === 'true';
    const costCenterIdString = request.nextUrl.searchParams.get('costCenterId');
    const includeDeleted =
      request.nextUrl.searchParams.get('includeDeleted') === 'true';

    let costCenterId = undefined;
    if (costCenterIdString) {
      costCenterId = parseInt(costCenterIdString);
      if (isNaN(costCenterId)) {
        return badRequestResponse('costCenterId must be a number');
      }
    }

    let result: CourseDto[];
    if (customCourse) {
      result = await getCustomCourses(costCenterId);
    } else {
      result = await getAllCourses(
        trainerId,
        includeDeleted,
        costCenterId ?? null,
      );
    }

    return NextResponse.json({ value: result });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
