import { NextRequest, NextResponse } from 'next/server';
import dayjs from 'dayjs';
import { allowOnlyAdmins, badRequestResponse, handleTopLevelCatch } from '@/lib/helpers-for-api';
import { ErrorDto, TrainingCountPerCourse } from '@/lib/dto';
import prisma from '@/lib/prisma';

async function countTrainings(startDate: dayjs.Dayjs, endDate: dayjs.Dayjs): Promise<TrainingCountPerCourse[]> {
  const sqlResult: { courseId: BigInt, courseName: string, count: BigInt }[] = await prisma.$queryRaw`
      SELECT C."name" AS "courseName",
             C."id" AS "courseId",
             COUNT(*) AS "count"
      FROM "Training" AS T
               INNER JOIN "Course" AS C ON T."courseId" = C."id"
      WHERE T."date" >= ${startDate.format('YYYY-MM-DD')}
        AND T."date" <= ${endDate.format('YYYY-MM-DD')}
      GROUP BY C."name", C."id";
`

  return sqlResult.map((sr) => ({
    count: Number(sr.count),
    course: { name: sr.courseName, id: Number(sr.courseId) },
  }));
}


export async function POST(request: NextRequest): Promise<NextResponse<{
  value: TrainingCountPerCourse[]
} | ErrorDto>> {
  try {
    await allowOnlyAdmins(request);
    const yearString = request.nextUrl.searchParams.get('year');
    const startDate = dayjs(`${yearString}-01-01`);
    const endDate = dayjs(`${yearString}-12-31`);
    if (!startDate.isValid() || !endDate.isValid()) {
      return badRequestResponse('startDate and endDate must be valid dates');
    }
    const value = await countTrainings(startDate, endDate);
    return NextResponse.json({ value });
  } catch (e) {
    return handleTopLevelCatch(e);
  }

}