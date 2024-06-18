import { TrainingUpdateRequest, TrainingUpdateStatusRequest } from '@/lib/dto';
import {
  ApiErrorBadRequest,
  ApiErrorConflict,
  ApiErrorNotFound,
  allowOnlyAdmins,
  emptyResponse,
  handleTopLevelCatch,
  validateOrThrow, idAsNumberOrThrow, allowAnyLoggedIn, allowAdminOrSelf,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { TrainingStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

async function doDELETE(request: NextRequest, idAsString: string) {
  await allowOnlyAdmins(request);
  const idAsNumber = parseInt(idAsString);
  if (!idAsNumber) {
    throw new ApiErrorBadRequest(`${idAsString} is not a valid id`);
  }

  await prisma.training.delete({ where: { id: idAsNumber } });
  return emptyResponse();
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await doDELETE(request, params.id);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function updateTraining(nextRequest: NextRequest, idAsString: string) {
  const id = idAsNumberOrThrow(idAsString);

  const request = await validateOrThrow(
    new TrainingUpdateRequest(await nextRequest.json()),
  );

  const training = await prisma.training.findUnique({where:{id}, include: {user: true}})
  if (!training) {
    throw new ApiErrorNotFound(`Training with id=${id} was not found`)
  }

  await allowAdminOrSelf(nextRequest, training.user.id);

  const result = await prisma.training.update({
    where: { id: id },
    data: {
      date: request.date,
      courseId: request.courseId,
      compensationCents: request.compensationCents,
      participantCount: request.participantCount,
    },
    include: {course: true, user: true}
  });

  return NextResponse.json(result);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // first test that we are logged in. Further down, we do more checks
    await allowAnyLoggedIn(request);
    return await updateTraining(request, params.id);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function doPATCH(nextRequest: NextRequest, params: { id: string }) {
  const idAsNumber = idAsNumberOrThrow(params.id)

  const request = await validateOrThrow(
    new TrainingUpdateStatusRequest(await nextRequest.json()),
  );

  const currentTraining = await prisma.training.findFirst({
    where: { id: idAsNumber },
  });
  if (!currentTraining) {
    throw new ApiErrorNotFound(
      'Training not found. Cannot update training status.',
    );
  }

  if (currentTraining.status === TrainingStatus.COMPENSATED) {
    throw new ApiErrorConflict(
      'Compensated trainings cannot be changed',
      'CompensatedTrainingIsImmutable',
    );
  }

  const result = await prisma.training.update({
    where: { id: idAsNumber },
    data: {
      status: request.status,
    },
    include: {course: true, user: true}
  });

  return NextResponse.json(result);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    await allowOnlyAdmins(request);

    return await doPATCH(request, params);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
