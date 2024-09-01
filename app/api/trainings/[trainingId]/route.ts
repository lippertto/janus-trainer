import { ErrorDto, TrainingDto, TrainingUpdateRequest, TrainingUpdateStatusRequest } from '@/lib/dto';
import {
  allowAdminOrSelf,
  allowAnyLoggedIn,
  allowOnlyAdmins,
  ApiErrorNotFound,
  emptyResponse,
  getOwnUserId,
  handleTopLevelCatch,
  idAsNumberOrThrow,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { transitionStatus } from '@/app/api/trainings/[trainingId]/transitionStatus';
import { trainingToDto } from '@/app/api/trainings/trainingUtils';
import { logger } from '@/lib/logging';

async function checkIfTrainingExistsAndIsOwn(id: number, nextRequest: NextRequest) {
  const training = await prisma.training.findUnique({ where: { id }, include: { user: true } });
  if (!training) {
    throw new ApiErrorNotFound(`Training with id=${id} was not found`);
  }
  await allowAdminOrSelf(nextRequest, training.user.id);
}

export async function DELETE(
  nextRequest: NextRequest,
  { params }: { params: { trainingId: string } },
) {
  try {
    await allowAnyLoggedIn(nextRequest);
    const id = idAsNumberOrThrow(params.trainingId);
    await checkIfTrainingExistsAndIsOwn(id, nextRequest);
    const userId = await getOwnUserId(nextRequest);
    await prisma.training.delete({ where: { id } });
    logger.info({ userId, trainingId: id }, `User ${userId} deleted training ${id}`);
    return emptyResponse();
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function updateTraining(request: TrainingUpdateRequest, id: number) {
  return prisma.training.update({
    where: { id: id },
    data: {
      date: request.date,
      courseId: request.courseId,
      compensationCents: request.compensationCents,
      participantCount: request.participantCount,
      comment: request.comment,
    },
    include: { course: true, user: true },
  });
}

export async function PUT(
  nextRequest: NextRequest,
  { params }: { params: { trainingId: string } },
): Promise<NextResponse<TrainingDto | ErrorDto>> {
  try {
    // first test that we are logged in. Further down, we do more checks
    await allowAnyLoggedIn(nextRequest);
    const id = idAsNumberOrThrow(params.trainingId);
    const userId = await getOwnUserId(nextRequest);
    await checkIfTrainingExistsAndIsOwn(id, nextRequest);

    const request = await validateOrThrow(TrainingUpdateRequest, await nextRequest.json());

    const result = await updateTraining(request, id);
    logger.info({ userId, trainingId: id }, `User ${userId} updated training ${id}`);

    return NextResponse.json(trainingToDto(result));
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

export async function PATCH(
  nextRequest: NextRequest,
  { params }: { params: { trainingId: string } },
): Promise<NextResponse<TrainingDto | ErrorDto>> {
  try {
    await allowOnlyAdmins(nextRequest);
    const userId = await getOwnUserId(nextRequest);
    const id = idAsNumberOrThrow(params.trainingId);
    const request = await validateOrThrow(TrainingUpdateStatusRequest, await nextRequest.json());
    const result = await transitionStatus(id, request.status);
    logger.info({ userId, trainingId: id }, `User ${userId} changed status of training ${id} to ${result.status}`);
    return NextResponse.json(trainingToDto(result));
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function returnOneTraining(request: NextRequest, idAsString: string): Promise<TrainingDto> {
  const id = idAsNumberOrThrow(idAsString);
  await checkIfTrainingExistsAndIsOwn(id, request);

  const training = await prisma.training.findFirst({
    where: { id },
    include: {
      user: true,
      course: true,
    },
  });
  if (!training) {
    throw new ApiErrorNotFound(
      'Training not found.',
    );
  }

  return trainingToDto(training);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { trainingId: string } },
): Promise<NextResponse<TrainingDto | ErrorDto>> {
  try {
    // first test that we are logged in. Further down, we do more checks
    await allowAnyLoggedIn(request);
    return NextResponse.json(await returnOneTraining(request, params.trainingId));
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}