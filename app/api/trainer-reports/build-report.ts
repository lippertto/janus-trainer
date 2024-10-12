import { TrainerReportCourseDto, TrainerReportDto } from '@/lib/dto';
import prisma from '@/lib/prisma';
import { ApiErrorNotFound } from '@/lib/helpers-for-api';
import dayjs from 'dayjs';

export async function buildTrainerReport(
  userId: string,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
): Promise<TrainerReportDto> {
  const trainer = await prisma.userInDb.findFirst({ where: { id: userId } });
  if (!trainer) {
    throw new ApiErrorNotFound(`Trainer with id ${userId} not found`);
  }

  const dbResult = await prisma.training.findMany({
    where: {
      userId: userId,
      date: {
        gte: startDate.format('YYYY-MM-DD'),
        lte: endDate.format('YYYY-MM-DD'),
      },
    },
    include: { course: true },
  });

  let courses: TrainerReportCourseDto[] = [];

  dbResult.forEach((t) => {
    let thisCourse = courses.find((c) => c.courseId === t.courseId);
    if (!thisCourse) {
      thisCourse = {
        courseName: t.course.name,
        courseId: t.course.id,
        trainings: [],
      };
      courses.push(thisCourse);
    }
    thisCourse.trainings.push({
      compensationCents: t.compensationCents,
      date: t.date,
    });
  });

  return {
    trainerName: trainer.name,
    courses,
    periodStart: startDate.format('YYYY-MM-DD'),
    periodEnd: endDate.format('YYYY-MM-DD'),
  };
}
