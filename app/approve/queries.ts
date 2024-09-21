import { TrainingDto } from '@/lib/dto';
import {
  QueryClient,
  useMutation,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { deleteFromApi, fetchListFromApi } from '@/lib/fetch';
import { API_TRAININGS } from '@/lib/routes';
import { showError, showSuccess } from '@/lib/notifications';
import dayjs from 'dayjs';

export function approveTrainingDeleteMutation(
  accessToken: string,
  trainings: TrainingDto[],
  setTrainings: (v: TrainingDto[]) => void,
) {
  return useMutation({
    mutationFn: (t: TrainingDto) => {
      return deleteFromApi<TrainingDto>(API_TRAININGS, t, accessToken ?? '');
    },
    onSuccess: (deleted: TrainingDto) => {
      const newTrainings = trainings.filter((t) => t.id !== deleted.id);
      setTrainings(newTrainings);
      showSuccess(`Training für ${deleted.course!.name} gelöscht`);
    },
    onError: (e) => {
      showError(`Fehler beim Löschen des Trainings`, e.message);
    },
  });
}

export function trainingsQueryForApprovePage(
  accessToken: string,
  filterStart: dayjs.Dayjs,
  filterEnd: dayjs.Dayjs,
  trainerId: string,
) {
  const params = new URLSearchParams();
  params.set('expand', 'user');
  params.set('trainerId', trainerId);

  params.set('start', filterStart.format('YYYY-MM-DD'));
  params.set('end', filterEnd.format('YYYY-MM-DD'));
  return useSuspenseQuery({
    queryKey: queryKeyForTrainings(filterStart, filterEnd, trainerId),
    queryFn: () =>
      fetchListFromApi<TrainingDto>(
        `${API_TRAININGS}?${params.toString()}`,
        accessToken!,
      ),
    staleTime: 10 * 60 * 1000,
  });
}

function queryKeyForTrainings(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  trainerId?: string,
) {
  return [
    'APPROVE',
    'TRAININGS',
    start.format('YYYY-MM-DD'),
    end.format('YYYY-MM-DD'),
    trainerId,
  ];
}

export function invalidateTrainingsForApprovePage(
  queryClient: QueryClient,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  trainerId?: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeyForTrainings(startDate, endDate, trainerId),
  });
}
