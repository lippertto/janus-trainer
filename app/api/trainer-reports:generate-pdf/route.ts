import { NextRequest } from 'next/server';
import { exportReportParams } from '@/app/api/trainer-reports/extract-report-params';
import { allowAdminOrSelf, handleTopLevelCatch } from '@/lib/helpers-for-api';
import { buildTrainerReport } from '@/app/api/trainer-reports/build-report';
import {
  generatePdf,
  TrainerReportInput,
} from '@/app/api/trainer-reports:generate-pdf/generate-pdf';
import dayjs from 'dayjs';

export async function POST(nextRequest: NextRequest) {
  try {
    const { trainerId, startDate, endDate } = exportReportParams(nextRequest);

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

    return new Response(data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment, filename="Janus-Trainings-${dayjs().format('YYYY-MM-DD')}.xlsx"`,
      },
    });
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
