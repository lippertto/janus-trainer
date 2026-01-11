import {
  ErrorDto,
  TrainingCreateRequest,
  TrainingDto,
  TrainingQueryResponse,
} from '@/lib/dto';
import {
  allowAdminOrSelf,
  allowNoOne,
  allowOnlyAdmins,
  ApiErrorBadRequest,
  emptyResponse,
  handleTopLevelCatch,
  idAsNumberOrThrow,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { Prisma, Training, TrainingStatus } from '@/generated/prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { trainingToDto } from '@/app/api/trainings/trainingUtils';
import { startWorkerThread } from 'synckit';

async function selectTrainings(
  trainerId: string | null,
  startDate: string | null,
  endDate: string | null,
  expandUser: boolean,
  courseId: number | null,
  status: TrainingStatus | null,
): Promise<TrainingDto[]> {
  let filter: Prisma.TrainingWhereInput = {};
  if (trainerId) {
    filter['userId'] = trainerId;
  }
  if (startDate && endDate) {
    filter['date'] = {
      gte: startDate,
      lte: endDate,
    };
  }
  if (courseId !== null) {
    filter['courseId'] = courseId;
  }
  if (status !== null) {
    filter['status'] = status;
  }

  const trainings = await prisma.training.findMany({
    where: filter,
    include: {
      user: expandUser,
      course: true,
    },
  });
  return trainings.map((t) => trainingToDto(t));
}

function stringToStatusOrThrow(v: string): TrainingStatus {
  if (!Object.values(TrainingStatus).includes(v as TrainingStatus)) {
    throw new ApiErrorBadRequest(`Bad training status given: ${v}`);
  } else {
    return v as TrainingStatus;
  }
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<TrainingQueryResponse | ErrorDto>> {
  try {
    const trainerId = request.nextUrl.searchParams.get('trainerId');
    const startDate = request.nextUrl.searchParams.get('start');
    const endDate = request.nextUrl.searchParams.get('end');
    const courseId = request.nextUrl.searchParams.get('courseId');
    const status = request.nextUrl.searchParams.get('status');

    const expandParameters = (
      request.nextUrl.searchParams.get('expand') ?? ''
    ).split(',');
    const expandUser = expandParameters.indexOf('user') !== -1;

    if (trainerId) {
      await allowAdminOrSelf(request, trainerId);
    } else {
      await allowOnlyAdmins(request);
    }

    const value = await selectTrainings(
      trainerId,
      startDate,
      endDate,
      expandUser,
      courseId ? idAsNumberOrThrow(courseId) : null,
      status ? stringToStatusOrThrow(status) : null,
    );
    return NextResponse.json({ value });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function doPOST(
  request: TrainingCreateRequest,
): Promise<NextResponse<Training>> {
  const result = await prisma.training.create({
    data: {
      date: request.date,
      compensationCents: request.compensationCents,
      userId: request.userId,
      status: TrainingStatus.NEW,
      createdAt: new Date(),
      participantCount: request.participantCount,
      courseId: request.courseId,
      comment: request.comment,
    },
    include: { user: true, course: true },
  });

  return NextResponse.json(result, { status: 201 });
}

export async function POST(nextRequest: NextRequest) {
  try {
    const request = await validateOrThrow(
      TrainingCreateRequest,
      await nextRequest.json(),
    );
    await allowAdminOrSelf(nextRequest, request.userId);

    return await doPOST(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function DELETE(nextRequest: NextRequest) {
  await allowNoOne(nextRequest);
  await prisma.training.deleteMany();
  return emptyResponse();
}
