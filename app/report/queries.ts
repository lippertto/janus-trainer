import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import {
  API_TRAINER_REPORTS,
  API_TRAINER_REPORTS_GENERATE_PDF,
} from '@/lib/routes';
import dayjs from 'dayjs';
import { TrainerReportDto } from '@/lib/dto';

export function queryTrainerReport(
  accessToken: string,
  trainerId: string,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
) {
  const params = new URLSearchParams();
  params.set('trainerId', trainerId);
  params.set('start', startDate.format('YYYY-MM-DD'));
  params.set('end', endDate.format('YYYY-MM-DD'));

  return useSuspenseQuery({
    queryKey: ['REPORT', 'trainer-reports', trainerId, startDate, endDate],
    queryFn: async () => {
      const response = await fetch(
        `${API_TRAINER_REPORTS}?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      if (response.status !== 200) {
        return Promise.reject(
          new Error(`Failed to get app-user: ${response.text()}`),
        );
      }

      return (await response.json()) as TrainerReportDto;
    },
    staleTime: 10 * 60 * 1000,
  });
}

export async function downloadTrainerReport(
  accessToken: string,
  trainerId: string,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
): Promise<Blob> {
  const params = new URLSearchParams();
  params.set('trainerId', trainerId);
  params.set('start', startDate.format('YYYY-MM-DD'));
  params.set('end', endDate.format('YYYY-MM-DD'));

  const response = await fetch(
    `${API_TRAINER_REPORTS_GENERATE_PDF}?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'appl',
      },
      method: 'POST',
    },
  );
  if (response.status !== 200) {
    return Promise.reject('Failed to download pdf');
  }
  return response.blob();
}
