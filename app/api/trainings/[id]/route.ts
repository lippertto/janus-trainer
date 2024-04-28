import { TrainingUpdateRequest, TrainingUpdateStatusRequest } from '@/lib/dto';
import {
  ApiErrorBadRequest,
  ApiErrorConflict,
  ApiErrorNotFound,
  allowOnlyAdmins,
  emptyResponse,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import { bigIntReplacer } from '@/lib/json-tools';
import prisma from '@/lib/prisma';
import { TrainingStatus } from '@prisma/client';
import { NextRequest } from 'next/server';

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

async function doPUT(nextRequest: NextRequest, idAsString: string) {
  await allowOnlyAdmins(nextRequest);
  const idAsNumber = parseInt(idAsString);
  if (!idAsNumber) {
    throw new ApiErrorBadRequest(`${idAsString} is not a valid id`);
  }

  const request = await validateOrThrow(
    new TrainingUpdateRequest(await nextRequest.json()),
  );

  const result = await prisma.training.update({
    where: { id: idAsNumber },
    data: {
      date: request.date,
      disciplineId: request.disciplineId,
      group: request.group,
      compensationCents: request.compensationCents,
      participantCount: request.participantCount,
    },
  });

  const data = JSON.stringify(result, bigIntReplacer);
  return new Response(data);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await doPUT(request, params.id);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function doPATCH(nextRequest: NextRequest, params: { id: string }) {
  await allowOnlyAdmins(nextRequest);
  const idAsNumber = parseInt(params.id);
  if (!idAsNumber) {
    throw new ApiErrorBadRequest(`${params.id} is not a valid id`);
  }

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
  });

  const data = JSON.stringify(result, bigIntReplacer);
  return new Response(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
): Promise<Response> {
  try {
    return await doPATCH(request, params);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
