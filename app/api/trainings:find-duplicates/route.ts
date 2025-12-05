import { NextRequest, NextResponse } from 'next/server';
import {
  ApiErrorBadRequest,
  ApiErrorForbidden,
  badRequestResponse,
  getOwnUserId,
  handleTopLevelCatch,
  isAdmin,
} from '@/lib/helpers-for-api';
import {
  ErrorDto,
  TrainingDuplicateDto,
  TrainingDuplicatResponse,
} from '@/lib/dto';
import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';

async function findDuplicatesInDatabase(
  ids: number[],
): Promise<TrainingDuplicateDto[]> {
  const queryResult = (await prisma.$queryRaw`
      SELECT "DuplicateTrainer"."name" AS "duplicateTrainerName",
             "Course"."name"           AS "duplicateCourseName",
             "Original".ID             AS "originalId",
             DUPLICATE.ID              AS "duplicateId"
      FROM "Training" AS "Original"
               INNER JOIN "Training" AS DUPLICATE ON "Original".DATE = DUPLICATE.DATE
          AND "Original"."courseId" = DUPLICATE."courseId"
          AND "Original".ID != DUPLICATE.ID
               INNER JOIN "User" AS "DuplicateTrainer" ON "DuplicateTrainer".ID = DUPLICATE."userId"
               INNER JOIN "Course" ON "Course".ID = DUPLICATE."courseId"
      WHERE "Original".ID IN (${Prisma.join(ids)});
  `) as any[];

  return queryResult.map((sqlResult: any) => ({
    queriedId: sqlResult['originalId'],
    duplicateId: sqlResult['duplicateId'],
    duplicateTrainerName: sqlResult['duplicateTrainerName'],
    duplicateCourseName: sqlResult['duplicateCourseName'],
  }));
}

function extractTrainingIds(searchParams: URLSearchParams): number[] {
  const trainingIdString = searchParams.get('trainingIds');
  if (!trainingIdString) {
    return [];
  }
  const trainingIds = trainingIdString.split(',').map((v) => {
    const parsed = parseInt(v);
    if (isNaN(parsed)) {
      throw new ApiErrorBadRequest(`Could not parse ${v}`);
    }
    return parsed;
  });
  return trainingIds;
}

export async function POST(
  nextRequest: NextRequest,
): Promise<NextResponse<TrainingDuplicatResponse | ErrorDto>> {
  try {
    const trainingIds = extractTrainingIds(nextRequest.nextUrl.searchParams);
    if (trainingIds.length === 0) {
      return NextResponse.json({ value: [] });
    }

    // if we are not admin, we check if all queried trainings are your own
    if (!(await isAdmin(nextRequest))) {
      await ensureAllTrainingsBelongToTrainer(
        await getOwnUserId(nextRequest),
        trainingIds,
      );
    }

    const duplicates = await findDuplicatesInDatabase(trainingIds);

    return NextResponse.json({ value: duplicates });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}

async function ensureAllTrainingsBelongToTrainer(
  ownUserId: string,
  trainingIds: number[],
) {
  const trainings = await prisma.training.findMany({
    where: {
      id: { in: trainingIds },
    },
  });

  for (const oneTraining of trainings) {
    if (oneTraining.userId !== ownUserId) {
      throw new ApiErrorForbidden(
        `Only own trainings may be accessed, but ${oneTraining.id} is not yours.`,
      );
    }
  }
}
