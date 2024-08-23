import { ErrorDto, TrainingCreateRequest, TrainingDto, TrainingQueryResponse } from '@/lib/dto';
import { allowAdminOrSelf, allowOnlyAdmins, handleTopLevelCatch, validateOrThrowOld } from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { Prisma, Training, TrainingStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { trainingToDto } from '@/app/api/trainings/trainingUtils';

async function selectTrainings(trainerId: string | null,
                               startDate: string | null,
                               endDate: string | null): Promise<TrainingDto[]> {
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

  const trainings = await prisma.training.findMany({
    where: filter,
    include: {
      user: true,
      course: true,
    },
  });
  return trainings.map((t) => (trainingToDto(t, t.user, t.course)));
}

export async function GET(request: NextRequest): Promise<NextResponse<TrainingQueryResponse | ErrorDto>> {
  try {
    const trainerId = request.nextUrl.searchParams.get('trainerId');
    const startDate = request.nextUrl.searchParams.get('start');
    const endDate = request.nextUrl.searchParams.get('end');

    if (trainerId) {
      await allowAdminOrSelf(request, trainerId);
    } else {
      await allowOnlyAdmins(request);
    }

    const value = await selectTrainings(trainerId, startDate, endDate);
    return NextResponse.json({ value });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function doPOST(
  nextRequest: NextRequest,
): Promise<NextResponse<Training>> {
  const request = await validateOrThrowOld(new TrainingCreateRequest(await nextRequest.json()));
  await allowAdminOrSelf(nextRequest, request.userId);

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

export async function POST(request: NextRequest) {
  try {
    return await doPOST(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
