import { NextRequest, NextResponse } from 'next/server';
import { ApiErrorBadRequest, handleTopLevelCatch } from '@/lib/helpers-for-api';
import dayjs from 'dayjs';
import { TrainingSummaryDto } from '@/lib/dto';
import prisma from '@/lib/prisma';

async function summarizeTrainings(startDate: dayjs.Dayjs, endDate: dayjs.Dayjs): Promise<NextResponse<TrainingSummaryDto>> {
  const sqlResult: any[] = await prisma.$queryRaw`
SELECT CAST(u."id" AS TEXT) AS "trainerId",
            u.name as "trainerName",
            COUNT(*) as "newTrainingCount"
    FROM "Training" AS gt INNER JOIN "User" AS u ON gt."userId" = u."id"
    WHERE gt.status = 'NEW'
    AND "u"."deletedAt" IS NULL
    AND "gt"."date" >= ${startDate}
    AND "gt"."date" <= ${endDate}
    GROUP BY ("u"."id", "u"."name");
`;
  const value = sqlResult.map((r) => ({
    trainerId: r.trainerId,
    trainerName: r.trainerName,
    newTrainingCount: Number(r.newTrainingCount),
  }));
  return NextResponse.json({value});
}

export async function POST(request: NextRequest) {
  try {
    const startString = request.nextUrl.searchParams.get('startDate');
    const endString = request.nextUrl.searchParams.get('endDate');
    const startDate = dayjs(startString);
    const endDate = dayjs(endString);
    if (!startDate.isValid() || !endDate.isValid()) {
      throw new ApiErrorBadRequest('startDate and endDate must be valid dates');
    }
    return summarizeTrainings(startDate, endDate);
  } catch (e) {
    return handleTopLevelCatch(e);
  }

}