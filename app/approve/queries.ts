import { TrainingDto, TrainingDuplicateDto, UserDto } from '@/lib/dto';
import {
  QueryClient,
  useMutation,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { deleteFromApi, fetchListFromApi, patchInApi } from '@/lib/fetch';
import { API_TRAININGS, API_TRAININGS_DUPLICATES } from '@/lib/routes';
import { showError, showSuccess } from '@/lib/notifications';
import dayjs from 'dayjs';
import { replaceElementWithId } from '@/lib/sort-and-filter';

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

export function queryTrainingsForApprovePage(
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

export function queryKeyForTrainings(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  trainerId: string | null,
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
  trainerId: string | null,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeyForTrainings(startDate, endDate, trainerId),
  });
}

export function queryDuplicates(accessToken: string, ids: number[]) {
  return useSuspenseQuery({
    queryKey: ['COMPENSATE', 'find-duplicates', ...ids],
    queryFn: () =>
      fetchListFromApi<TrainingDuplicateDto>(
        `${API_TRAININGS_DUPLICATES}?trainingIds=${ids.join(',')}`,
        accessToken,
        'POST',
      ),
    staleTime: 10 * 60 * 1000,
  });
}

export function approveMutation(
  accessToken: string,
  trainings: TrainingDto[],
  setTrainings: (v: TrainingDto[]) => void,
  refresh: () => void,
) {
  return useMutation({
    mutationFn: (id: number) => {
      return patchInApi<TrainingDto>(
        API_TRAININGS,
        id,
        { status: 'APPROVED' },
        accessToken,
      );
    },
    onSuccess: (updated) => {
      setTrainings(replaceElementWithId(trainings, updated));
      refresh();
    },
    onError: (e) => {
      showError(`Fehler bei der Freigabe des Trainings`, e.message);
    },
  });
}
