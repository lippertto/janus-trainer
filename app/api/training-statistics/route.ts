// noinspection ExceptionCaughtLocallyJS

import { NextRequest, NextResponse } from 'next/server';
import {
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
  groupBy: 'trainer' | 'cost-center' | 'course',
): Promise<TrainingStatisticDto[]> {
  const startDate = `'${year}-01-01'`;
  const endDate = `'${year}-12-31'`;

  let selectSql;
  let groupBySql;
  if (groupBy === 'trainer') {
    selectSql = `SELECT "User"."name" AS "trainerName", \n`;
    groupBySql = `GROUP BY "User"."name" \n`;
  } else if (groupBy === 'cost-center') {
    selectSql = `SELECT "Discipline"."name" AS "costCenterName", \n`;
    groupBySql = `GROUP BY "Discipline"."name" \n`;
  } else if (groupBy === 'course') {
    selectSql = `SELECT "Course"."name" AS "courseName", "Course"."id" as "courseId", \n`;
    groupBySql = `GROUP BY "Course"."id", "Course"."name" \n`;
  }

  let query = `
      ${selectSql}
             COUNT(DISTINCT CASE
                     WHEN TO_NUMBER(SPLIT_PART("date", '-', 2), '09') BETWEEN 1 AND 3 THEN "date"
                     ELSE NULL
                 END)                 AS "trainingCountQ1",
             COUNT(DISTINCT CASE
                     WHEN TO_NUMBER(SPLIT_PART("date", '-', 2), '09') BETWEEN 4 AND 6 THEN "date"
                     ELSE NULL
                 END)                 AS "trainingCountQ2",
             COUNT(DISTINCT CASE
                     WHEN TO_NUMBER(SPLIT_PART("date", '-', 2), '09') BETWEEN 7 AND 9 THEN "date"
                     ELSE NULL
                 END)                 AS "trainingCountQ3",
             COUNT(DISTINCT CASE
                     WHEN TO_NUMBER(SPLIT_PART("date", '-', 2), '09') BETWEEN 10 AND 12 THEN "date"
                     ELSE NULL
                 END)                 AS "trainingCountQ4",
             COUNT(DISTINCT "date")   AS "trainingCountTotal",
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
      ${groupBySql}
  `;

  const sqlResult: any[] = await prisma.$queryRawUnsafe(query);

  return sqlResult.map((r) => ({
    trainerId: r.trainerName,
    trainerName: r.trainerName,
    costCenterName: r.costCenterName,
    courseId: r.courseId,
    courseName: r.courseName,
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
    await allowOnlyAdmins(request);

    const groupByParam = request.nextUrl.searchParams.get('groupBy');
    if (!groupByParam) {
      return badRequestResponse('Must provide groupBy parameter');
    }
    let groupBy: 'trainer' | 'cost-center' | 'course';
    if (groupByParam === 'trainer') {
      groupBy = 'trainer';
    } else if (groupByParam === 'cost-center') {
      groupBy = 'cost-center';
    } else if (groupByParam === 'course') {
      groupBy = 'course';
    } else {
      return badRequestResponse('Unknown groupBy parameter');
    }

    const yearAsString = request.nextUrl.searchParams.get('year');
    if (!yearAsString) {
      throw new ApiErrorBadRequest('year-parameter has to be provided');
    }
    const year = parseInt(yearAsString);
    if (!year) {
      throw new ApiErrorBadRequest('year is not a number');
    }

    const result = await calculateYearlyTotals(year, groupBy);
    return NextResponse.json({ value: result });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
