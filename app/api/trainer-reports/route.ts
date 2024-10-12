import { NextRequest, NextResponse } from 'next/server';
import { allowAdminOrSelf, handleTopLevelCatch } from '@/lib/helpers-for-api';
import { ErrorDto, TrainerReportDto } from '@/lib/dto';
import { buildTrainerReport } from '@/app/api/trainer-reports/build-report';
import { exportReportParams } from '@/app/api/trainer-reports/extract-report-params';

export async function GET(
  nextRequest: NextRequest,
): Promise<NextResponse<ErrorDto | TrainerReportDto>> {
  try {
    const { trainerId, startDate, endDate } = exportReportParams(nextRequest);

    await allowAdminOrSelf(nextRequest, trainerId);

    return NextResponse.json(
      await buildTrainerReport(trainerId, startDate, endDate),
    );
  } catch (e) {
    return handleTopLevelCatch(e);
  }
}
