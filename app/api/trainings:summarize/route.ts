import { NextRequest, NextResponse } from 'next/server';
import { badRequestResponse, handleTopLevelCatch } from '@/lib/helpers-for-api';
import dayjs from 'dayjs';
import { ErrorDto, TrainingSummaryListDto } from '@/lib/dto';
import prisma from '@/lib/prisma';

async function summarizeTrainings(
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
): Promise<NextResponse<TrainingSummaryListDto>> {
  const sqlResult: any[] = await prisma.$queryRaw`
      SELECT CAST(u."id" AS TEXT)                                    AS "trainerId",
             u.name                                                  as "trainerName",
             SUM(case when gt.status = 'NEW' then 1 else 0 end)      as "newTrainingCount",
             SUM(case when gt.status = 'APPROVED' then 1 else 0 end) as "approvedTrainingCount"
      FROM "Training" AS gt
               INNER JOIN "User" AS u ON gt."userId" = u."id"
      WHERE "u"."deletedAt" IS NULL
        AND "gt"."date" >= ${startDate.format('YYYY-MM-DD')}
        AND "gt"."date" <= ${endDate.format('YYYY-MM-DD')}
      GROUP BY ("u"."id", "u"."name");
  `;
  const value = sqlResult.map((r) => ({
    trainerId: r.trainerId,
    trainerName: r.trainerName,
    newTrainingCount: Number(r.newTrainingCount),
    approvedTrainingCount: Number(r.approvedTrainingCount),
  }));
  return NextResponse.json({ value });
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<TrainingSummaryListDto | ErrorDto>> {
  try {
    const startString = request.nextUrl.searchParams.get('startDate');
    const endString = request.nextUrl.searchParams.get('endDate');
    const startDate = dayjs(startString);
    const endDate = dayjs(endString);
    if (!startDate.isValid() || !endDate.isValid()) {
      return badRequestResponse('startDate and endDate must be valid dates');
    }
    return summarizeTrainings(startDate, endDate);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
