import { CompensationDto, CompensationQueryResponse, ErrorDto } from '@/lib/dto';
import { allowOnlyAdmins, handleTopLevelCatch, idAsNumberOrThrow } from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

function sqlResultToQueryResponse(sqlResult: any): CompensationQueryResponse {
  const value: CompensationDto[] = sqlResult.map((r: any): CompensationDto => ({
    user: {
      id: r.userId,
      name: r.userName,
      iban: r.userIban,
    },
    totalCompensationCents: Number(r.totalCompensationCents),
    totalTrainings: Number(r.totalTrainings),
    correspondingIds: r.correspondingIds.split(',').map((id: any) => Number(id)),
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    costCenterId: r.costCenterId,
    costCenterName: r.costCenterName,
    courseName: r.courseName,
  }));
  return { value };
}

async function compensationForApprovedTrainings(): Promise<CompensationQueryResponse> {
  const sqlResult: any[] = await prisma.$queryRaw`
      SELECT CAST(u."id" AS TEXT)           AS "userId",
             u.name                         as "userName",
             u.iban                         as "userIban",
             COUNT(*)                       as "totalTrainings",
             SUM(t."compensationCents")     as "totalCompensationCents",
             string_agg(t.id::varchar, ',') as "correspondingIds",
             MIN(t.date)                    as "periodStart",
             MAX(t.date)                    as "periodEnd",
             "course"."name"                as "courseName",
             "d"."name"                     as "costCenterName",
             "d"."costCenterId"             as "costCenterId"
      FROM "Training" AS t
               INNER JOIN "User" AS u ON t."userId" = u."id"
               INNER JOIN "Course" AS "course" ON "t"."courseId" = "course".id
               INNER JOIN "Discipline" as "d" ON "course"."disciplineId" = "d".id
      WHERE t.status = 'APPROVED'
        AND "u"."deletedAt" IS NULL
      AND "u"."iban" IS NOT NULL
      GROUP BY ("u"."id", "u"."name", "u"."iban", "d"."costCenterId", "d"."name", "course"."name");
  `;
  return sqlResultToQueryResponse(sqlResult)
}

async function compensationsForPayments(paymentIdAsString: string): Promise<CompensationQueryResponse> {
  const paymentId = idAsNumberOrThrow(paymentIdAsString);

  const sqlResult: any[] = await prisma.$queryRaw`
      SELECT CAST(u."id" AS TEXT)           AS "userId",
             u.name                         as "userName",
             u.iban                         as "userIban",
             COUNT(*)                       as "totalTrainings",
             SUM(t."compensationCents")     as "totalCompensationCents",
             string_agg(t.id::varchar, ',') as "correspondingIds",
             MIN(t.date)                    as "periodStart",
             MAX(t.date)                    as "periodEnd",
             "course"."name"                as "courseName",
             "d"."name"                     as "costCenterName",
             "d"."costCenterId"             as "costCenterId"
      FROM "Training" AS t
               INNER JOIN "User" AS u ON t."userId" = u."id"
               INNER JOIN "Course" AS "course" ON "t"."courseId" = "course".id
               INNER JOIN "Discipline" as "d" ON "course"."disciplineId" = "d".id
      WHERE "t"."paymentId" = ${paymentId}
        AND "u"."deletedAt" IS NULL
      GROUP BY ("u"."id", "u"."name", "u"."iban", "d"."costCenterId", "d"."name", "course"."name");
  `;
  return sqlResultToQueryResponse(sqlResult);
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<CompensationQueryResponse | ErrorDto>> {
  try {
    await allowOnlyAdmins(request);

    const paymentId = request.nextUrl.searchParams.get('paymentId');
    if (!paymentId) {
      return NextResponse.json(await compensationForApprovedTrainings());
    } else {
      return NextResponse.json(await compensationsForPayments(paymentId));
    }
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
