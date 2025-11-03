import { NextRequest } from 'next/server';
import { exportReportParams } from '@/app/api/trainer-reports/extract-report-params';
import { allowAdminOrSelf, handleTopLevelCatch } from '@/lib/helpers-for-api';
import { buildTrainerReport } from '@/app/api/trainer-reports/build-report';
import {
  generatePdf,
  TrainerReportInput,
} from '@/app/api/trainer-reports:generate-pdf/generate-pdf';
import dayjs from 'dayjs';
import { logger } from '@/lib/logging';

export async function POST(nextRequest: NextRequest) {
  try {
    const { trainerId, startDate, endDate } = exportReportParams(nextRequest);
    logger.info(
      `Requesting pdf for: ${trainerId}, start=${startDate.format('YYYY-MM-DD')}, ` +
        `end=${endDate.format('YYYY-MM-DD')}`,
    );

    await allowAdminOrSelf(nextRequest, trainerId);

    const reportData = await buildTrainerReport(trainerId, startDate, endDate);

    const reportInput: TrainerReportInput = {
      trainerName: reportData.trainerName,
      periodStart: dayjs(reportData.periodStart),
      periodEnd: dayjs(reportData.periodEnd),
      courses: reportData.courses.map((c) => ({
        courseName: c.courseName,
        trainings: c.trainings,
      })),
    };

    const data = await generatePdf(dayjs(), reportInput);

    logger.info(`Pdf for user ${trainerId}: was successfully created.`);
    return new Response(new Blob([data as BlobPart]), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment, filename="Janus-Trainings-${dayjs().format('YYYY-MM-DD')}.xlsx"`,
      },
    });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
