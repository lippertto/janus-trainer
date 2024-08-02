// noinspection ExceptionCaughtLocallyJS

import { NextRequest, NextResponse } from 'next/server';
import {
  allowAdminOrSelf,
  allowAnyLoggedIn,
  allowOnlyAdmins,
  ApiErrorBadRequest,
  handleTopLevelCatch,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { ErrorDto, YearlyTotalDto, YearlyTotalQueryResponseDto } from '@/lib/dto';


async function calculateYearlyTotals(year: number, trainerId: string | null): Promise<YearlyTotalDto[]> {
  let trainerWhere = Prisma.empty;
  if (trainerId) {
    trainerWhere = Prisma.sql`AND "userId" = ${trainerId}`;
  }
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const sqlResult: any[] = await prisma.$queryRaw`
      SELECT "User"."name"            AS "trainerName",
             SUM(CASE
                     WHEN TO_NUMBER(SPLIT_PART("date", '-', 2), '09') BETWEEN 1 AND 3 THEN 1
                     ELSE 0
                 END)                 AS "trainingCountQ1",
             SUM(CASE
                     WHEN TO_NUMBER(SPLIT_PART("date", '-', 2), '09') BETWEEN 4 AND 6 THEN 1
                     ELSE 0
                 END)                 AS "trainingCountQ2",
             SUM(CASE
                     WHEN TO_NUMBER(SPLIT_PART("date", '-', 2), '09') BETWEEN 7 AND 9 THEN 1
                     ELSE 0
                 END)                 AS "trainingCountQ3",
             SUM(CASE
                     WHEN TO_NUMBER(SPLIT_PART("date", '-', 2), '09') BETWEEN 10 AND 12 THEN 1
                     ELSE 0
                 END)                 AS "trainingCountQ4",
             COUNT(*)                 AS "trainingCountTotal",
             SUM(CASE
                     WHEN TO_NUMBER(SPLIT_PART("date", '-', 2), '09') BETWEEN 1 AND 3 THEN "compensationCents"
                     ELSE 0
                 END)                 AS "compensationCentsQ1",
             SUM(CASE
                     WHEN TO_NUMBER(SPLIT_PART("date", '-', 2), '09') BETWEEN 4 AND 6 THEN "compensationCents"
                     ELSE 0
                 END)                 AS "compensationCentsQ2",
             SUM(CASE
                     WHEN TO_NUMBER(SPLIT_PART("date", '-', 2), '09') BETWEEN 7 AND 9 THEN "compensationCents"
                     ELSE 0
                 END)                 AS "compensationCentsQ3",
             SUM(CASE
                     WHEN TO_NUMBER(SPLIT_PART("date", '-', 2), '09') BETWEEN 10 AND 12 THEN "compensationCents"
                     ELSE 0
                 END)                 AS "compensationCentsQ4",
             SUM("compensationCents") as "compensationCentsTotal"
      FROM "Training"
               INNER JOIN "User" ON "Training"."userId" = "User"."id"
      WHERE "date" >= ${startDate}
        AND "date" <= ${endDate}
        AND "status" = 'COMPENSATED'
          ${trainerWhere}
      GROUP BY "User"."name"
  `;

  if (trainerId && sqlResult.length == 0) {
    console.log(sqlResult.length === 0);
    return [{
      trainerId: trainerId,
      trainerName: trainerId, // we use the id but we don't care
      trainingCountQ1: 0,
      trainingCountQ2: 0,
      trainingCountQ3: 0,
      trainingCountQ4: 0,
      trainingCountTotal: 0,
      compensationCentsQ1: 0,
      compensationCentsQ2: 0,
      compensationCentsQ3: 0,
      compensationCentsQ4: 0,
      compensationCentsTotal: 0,
    },
    ];
  }

  return sqlResult.map((r) => ({
    trainerId: r.trainerName,
    trainerName: r.trainerName,
    trainingCountQ1: Number(r.trainingCountQ1),
    trainingCountQ2: Number(r.trainingCountQ2),
    trainingCountQ3: Number(r.trainingCountQ3),
    trainingCountQ4: Number(r.trainingCountQ4),
    trainingCountTotal: Number(r.trainingCountTotal),
    compensationCentsQ1: Number(r.compensationCentsQ1),
    compensationCentsQ2: Number(r.compensationCentsQ2),
    compensationCentsQ3: Number(r.compensationCentsQ3),
    compensationCentsQ4: Number(r.compensationCentsQ4),
    compensationCentsTotal: Number(r.compensationCentsTotal),
  }));
}


export async function POST(request: NextRequest): Promise<NextResponse<YearlyTotalQueryResponseDto | ErrorDto>> {
  try {
    await allowAnyLoggedIn(request);

    const trainerId = request.nextUrl.searchParams.get('trainerId');
    if (trainerId) {
      await allowAdminOrSelf(request, trainerId);
    } else {
      await allowOnlyAdmins(request);
    }

    const yearAsString = request.nextUrl.searchParams.get('year');
    if (!yearAsString) {
      throw new ApiErrorBadRequest('year-parameter has to be provided');
    }
    const year = parseInt(yearAsString);
    if (!year) {
      throw new ApiErrorBadRequest('year is not a number');
    }

    const result = await calculateYearlyTotals(year, trainerId);
    return NextResponse.json({ value: result });

  } catch (e) {
    return handleTopLevelCatch(e);
  }
}