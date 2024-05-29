import { NextRequest, NextResponse } from 'next/server';
import { Course } from '@prisma/client';
import { CourseCreateRequest, CourseQueryResponse, ErrorResponse } from '@/lib/dto';
import {
  allowAnyLoggedIn,
  allowOnlyAdmins,
  ApiErrorBadRequest,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';

async function createCourse(nextRequest: NextRequest) {
  const rawRequest = new CourseCreateRequest(await nextRequest.json());
  const request: CourseCreateRequest = await validateOrThrow<CourseCreateRequest>(
    rawRequest);

  const course = await prisma.course.create({
    data: {
      name: request.name,
      startHour: request.startHour,
      startMinute: request.startMinute,
      durationMinutes: request.durationMinutes,
      weekdays: request.weekdays,
      disciplineId: request.disciplineId,
      trainers: {
        connect: request.trainerIds.map((t) => ({ id: t })),
      },
      allowedCompensations: {
        connect: request.allowedCompensationIds.map((id) => ({ id })),
      },
    },
    include: { trainers: true, allowedCompensations: true },
  });

  return NextResponse.json(course, { status: 201 });
}

export async function POST(nextRequest: NextRequest): Promise<NextResponse<Course | ErrorResponse>> {
  try {
    await allowOnlyAdmins(nextRequest);

    return await createCourse(nextRequest);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function getAllCourses(disciplineId: string | null, trainerId: string | null): Promise<NextResponse<CourseQueryResponse>> {

  if (!disciplineId && !trainerId) {
    throw new ApiErrorBadRequest('Must provide a filter, either disciplineId or trainerId');
  }
  if (disciplineId && trainerId) {
    throw new ApiErrorBadRequest('Can process only one filter, either disciplineId or trainerId');
  }

  let filter;
  if (disciplineId) {
    filter = { disciplineId: parseInt(disciplineId) };
  } else {
    filter = {
      trainers: {
        some: { id: trainerId! },
      },
    };
  }
  const value = await prisma.course.findMany(
    {
      where: filter,
      include: { trainers: true, allowedCompensations: true },
    },
  );
  return NextResponse.json({ value });
}

export async function GET(request: NextRequest): Promise<NextResponse<CourseQueryResponse | ErrorResponse>> {
  try {
    await allowAnyLoggedIn(request);
    return await getAllCourses(request.nextUrl.searchParams.get('disciplineId'), request.nextUrl.searchParams.get('trainerId'));
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}