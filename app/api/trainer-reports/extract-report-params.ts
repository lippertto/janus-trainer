import { NextRequest } from 'next/server';
import { ApiErrorBadRequest, badRequestResponse } from '@/lib/helpers-for-api';
import dayjs from 'dayjs';

export function exportReportParams(nextRequest: NextRequest): {
  trainerId: string;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
} {
  const trainerId = nextRequest.nextUrl.searchParams.get('trainerId');
  if (!trainerId) {
    throw new ApiErrorBadRequest('Must provide trainerId');
  }

  const start = nextRequest.nextUrl.searchParams.get('start');
  if (!start) {
    throw new ApiErrorBadRequest('must provide start');
  }
  const end = nextRequest.nextUrl.searchParams.get('end');
  if (!end) {
    throw new ApiErrorBadRequest('Must provide end');
  }

  const startDate = dayjs(start);
  if (!startDate.isValid()) {
    throw new ApiErrorBadRequest('bad start date');
  }

  const endDate = dayjs(end);
  if (!endDate.isValid()) {
    throw new ApiErrorBadRequest('bad end date');
  }

  return { trainerId, startDate, endDate };
}
