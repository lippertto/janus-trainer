import { CompensationQueryResponse, ErrorResponse } from '@/lib/dto';
import { allowOnlyAdmins, handleTopLevelCatch } from '@/lib/helpers-for-api';
import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

async function doGET(
  request: NextRequest,
): Promise<NextResponse<CompensationQueryResponse>> {
  await allowOnlyAdmins(request);

  const sqlResult: any[] = await prisma.$queryRaw`
SELECT CAST(u."id" AS TEXT) AS "userId",
            u.name as "userName",
            u.iban as "userIban",
            COUNT(*) as "totalTrainings",
            SUM(gt."compensationCents") as "totalCompensationCents",
            string_agg(gt.id::varchar, ',') as "correspondingIds",
            MIN(gt.date) as "periodStart",
            MAX(gt.date) as "periodEnd"
    FROM "Training" AS gt INNER JOIN "User" AS u ON gt."userId" = u."id"
    WHERE gt.status = 'APPROVED'
    AND "u"."deletedAt" IS NULL
    GROUP BY ("u"."id", "u"."name", "u"."iban");
`;
  const value = sqlResult.map((r) => ({
    user: {
      id: r.userId,
      name: r.userName,
      iban: r.userIban,
    },
    totalCompensationCents: Number(r.totalCompensationCents),
    totalTrainings: Number(r.totalTrainings),
    correspondingIds: r.correspondingIds.split(','),
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
  }));
  return NextResponse.json({ value });
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<CompensationQueryResponse | ErrorResponse>> {
  try {
    return await doGET(request);
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
