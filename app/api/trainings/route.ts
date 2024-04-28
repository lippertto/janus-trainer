import {
  ErrorResponse,
  TrainingBatchUpdateRequest,
  TrainingBatchUpdateReponse,
  TrainingCreateRequest,
} from '@/lib/dto';
import {
  ApiErrorBadRequest,
  ApiError,
  allowAdminOrSelf,
  allowOnlyAdmins,
  handleTopLevelCatch,
  validateOrThrow,
} from '@/lib/helpers-for-api';
import { bigIntReplacer } from '@/lib/json-tools';
import prisma from '@/lib/prisma';
import { TrainingDtoNew } from '@/lib/dto';
import { Training, TrainingStatus } from '@prisma/client';
import { validate } from 'class-validator';
import { NextRequest, NextResponse } from 'next/server';

export type TrainingQueryResponse = {
  value: TrainingDtoNew[];
};

async function validateCreateRequest(
  incomingRequest: any,
): Promise<TrainingCreateRequest> {
  const request = new TrainingCreateRequest(incomingRequest);
  const validationErrors = await validate(request);
  if (validationErrors.length !== 0) {
    throw new ApiErrorBadRequest(
      'Request to create training is invalid.' +
        JSON.stringify(validationErrors),
    );
  }
  return request;
}

async function trainingsByUser(userId: string) {
  const value = await prisma.training.findMany({
    where: { userId },
    include: {
      user: true,
      discipline: true,
    },
  });

  const data = JSON.stringify(
    { value } as TrainingQueryResponse,
    bigIntReplacer,
  );
  return new Response(data, { status: 200 });
}

async function trainingsByDate(startDate: string, endDate: string) {
  const value = await prisma.training.findMany({
    where: {
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    include: {
      user: true,
      discipline: true,
    },
  });

  const data = JSON.stringify(
    { value } as TrainingQueryResponse,
    bigIntReplacer,
  );
  return new Response(data, { status: 200 });
}

async function doGET(request: NextRequest): Promise<Response> {
  const userId = request.nextUrl.searchParams.get('userId');
  const startDate = request.nextUrl.searchParams.get('start');
  const endDate = request.nextUrl.searchParams.get('end');

  if (userId) {
    if (startDate || endDate) {
      throw new ApiErrorBadRequest(
        'userId must not be used together with startDate and endDate',
      );
    }
    allowAdminOrSelf(request, userId);
    return trainingsByUser(userId);
  } else {
    allowOnlyAdmins(request);
    if (!startDate || !endDate) {
      throw new ApiErrorBadRequest('start and end must be provided');
    }
    return trainingsByDate(startDate, endDate);
  }
}

export async function GET(request: NextRequest) {
  try {
    return await doGET(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function doPOST(
  nextRequest: NextRequest,
): Promise<NextResponse<Training>> {
  const request = await validateCreateRequest(await nextRequest.json());

  const result = await prisma.training.create({
    data: {
      date: request.date,
      disciplineId: request.disciplineId,
      group: request.group,
      compensationCents: request.compensationCents,
      userId: request.userId,
      status: TrainingStatus.NEW,
      createdAt: new Date(),
      participantCount: request.participantCount,
    },
    include: { discipline: true, user: true },
  });

  const data = JSON.stringify(result, bigIntReplacer);
  return new NextResponse(data, { status: 201 });
}

export async function POST(request: NextRequest) {
  try {
    return await doPOST(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function transitionOneTraining(
  id: number | string,
  status: TrainingStatus,
) {
  // for some reason class-validator lets through strings. We'll just handle it here.
  const idAsNumber = typeof id === 'number' ? id : parseInt(id);

  await prisma.training.update({
    where: { id: idAsNumber },
    data: {
      status,
    },
  });
}

async function doPATCH(
  nextRequest: NextRequest,
): Promise<NextResponse<TrainingBatchUpdateReponse>> {
  await allowOnlyAdmins(nextRequest);

  const request = await validateOrThrow(
    new TrainingBatchUpdateRequest(await nextRequest.json()),
  );

  const result = await request.operations.map(
    async (op): Promise<'OK' | ErrorResponse> => {
      try {
        const id = op.id;
        switch (op.operation) {
          case 'SET_COMPENSATED':
            await transitionOneTraining(id, TrainingStatus.COMPENSATED);
            return 'OK';
          default:
            return {
              error: {
                code: 'InvalidBatchOperation',
                message: 'Unknown operation encountered',
              },
            };
        }
      } catch (e) {
        if (e instanceof ApiError) {
          return {
            error: { code: 'SetCompensatedStatusFailed', message: e.message },
          };
        } else {
          return {
            error: {
              code: 'SetCompensatedStatusFailed',
              message: 'Unexpected error',
            },
          };
        }
      }
    },
  );

  return NextResponse.json({ value: await Promise.all(result) });
}

export async function PATCH(
  request: NextRequest,
): Promise<NextResponse<TrainingBatchUpdateReponse | ErrorResponse>> {
  try {
    return await doPATCH(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
