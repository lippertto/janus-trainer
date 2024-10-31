import {
  CourseDto,
  TrainingDto,
  TrainingDuplicateDto,
  UserDto,
} from '@/lib/dto';
import {
  QueryClient,
  useMutation,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { deleteFromApi, fetchListFromApi, patchInApi } from '@/lib/fetch';
import {
  API_COURSES,
  API_TRAININGS,
  API_TRAININGS_DUPLICATES,
  API_USERS,
} from '@/lib/routes';
import { showError, showSuccess } from '@/lib/notifications';
import dayjs from 'dayjs';
import { replaceElementWithId } from '@/lib/sort-and-filter';

export function approveTrainingDeleteMutation(
  accessToken: string,
  invalidateCurrentTrainings: () => void,
) {
  return useMutation({
    mutationFn: (t: TrainingDto) => {
      return deleteFromApi<TrainingDto>(API_TRAININGS, t, accessToken ?? '');
    },
    onSuccess: (deleted: TrainingDto) => {
      invalidateCurrentTrainings();
      showSuccess(`Training für ${deleted.course!.name} gelöscht`);
    },
    onError: (e) => {
      showError(`Fehler beim Löschen des Trainings`, e.message);
    },
  });
}

export function queryKeyForTrainings(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  trainerId: string | null,
) {
  return [
    'APPROVE',
    'trainings',
    start.format('YYYY-MM-DD'),
    end.format('YYYY-MM-DD'),
    trainerId,
  ];
}

export function queryDuplicates(accessToken: string, ids: number[]) {
  return useSuspenseQuery({
    queryKey: ['APPROVE', 'find-duplicates', ...ids],
    queryFn: () =>
      fetchListFromApi<TrainingDuplicateDto>(
        `${API_TRAININGS_DUPLICATES}?trainingIds=${ids.join(',')}`,
        accessToken,
        'POST',
      ),
    staleTime: 10 * 60 * 1000,
  });
}

export function trainerQuery(accessToken: string) {
  return useSuspenseQuery({
    queryKey: ['APPROVE', 'trainers'],
    queryFn: () => fetchListFromApi<UserDto>(API_USERS, accessToken),
  });
}

export function coursesQuery(accessToken: string, trainerId: string | null) {
  return useSuspenseQuery({
    queryKey: ['APPROVE', 'courses', trainerId],
    queryFn: () =>
      trainerId
        ? fetchListFromApi<CourseDto>(
            `${API_COURSES}?trainerId=${trainerId}`,
            accessToken,
          )
        : [],
  });
}
