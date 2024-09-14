// noinspection ExceptionCaughtLocallyJS

import { NextRequest, NextResponse } from 'next/server';
import {
  allowAdminOrSelf,
  allowAnyLoggedIn,
  allowOnlyAdmins,
  ApiErrorBadRequest,
  badRequestResponse,
  handleTopLevelCatch,
} from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import {
  ErrorDto,
  TrainingStatisticDto,
  TrainingStatisticsResponse,
} from '@/lib/dto';

async function calculateYearlyTotals(
  year: number,
  trainerId: string | null,
  groupBy: 'trainer' | 'cost-center',
): Promise<TrainingStatisticDto[]> {
  let trainerWhere = '';
  if (trainerId) {
    trainerWhere = `AND "userId" = '${trainerId}'`;
  }
  const startDate = `'${year}-01-01'`;
  const endDate = `'${year}-12-31'`;

  let selectSql;
  let groupBySql;
  if (groupBy === 'trainer') {
    selectSql = `SELECT "User"."name" AS "trainerName", \n`;
    groupBySql = `GROUP BY "User"."name" \n`;
  } else {
    selectSql = `SELECT "Discipline"."name" AS "costCenterName", \n`;
    groupBySql = `GROUP BY "Discipline"."name" \n`;
  }

  let query = `
      ${selectSql}
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
               INNER JOIN "Course" ON "Training"."courseId" = "Course"."id"
               INNER JOIN "Discipline" ON "Course"."disciplineId" = "Discipline"."id"
      WHERE "date" >= ${startDate}
        AND "date" <= ${endDate}
        AND "status" = 'COMPENSATED'
          ${trainerWhere}
      ${groupBySql}
  `;

  const sqlResult: any[] = await prisma.$queryRawUnsafe(query);

  if (trainerId && sqlResult.length == 0) {
    console.log(sqlResult.length === 0);
    return [
      {
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
    costCenterName: r.costCenterName,
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

/**
 * Action to retrieve statistics on trainings.
 * The request takes the following query parameters:
 * trainerId? - filter statistics on an individual trainer.
 * year: number - must be set to filter for a year
 * groupBy: "cost-center" | "trainer" - whether to group the results by trainer or by cost-center
 */
export async function POST(
  request: NextRequest,
): Promise<NextResponse<TrainingStatisticsResponse | ErrorDto>> {
  try {
    await allowAnyLoggedIn(request);

    const groupByParam = request.nextUrl.searchParams.get('groupBy');
    if (!groupByParam) {
      return badRequestResponse('Must provide groupBy parameter');
    }
    let groupBy: 'trainer' | 'cost-center';
    if (groupByParam === 'trainer') {
      groupBy = 'trainer';
    } else if (groupByParam === 'cost-center') {
      groupBy = 'cost-center';
    } else {
      return badRequestResponse('Unknown groupBy parameter');
    }

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

    const result = await calculateYearlyTotals(year, trainerId, groupBy);
    return NextResponse.json({ value: result });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
