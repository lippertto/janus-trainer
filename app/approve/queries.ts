import {
  CourseDto,
  TrainingDto,
  TrainingDuplicateDto,
  TrainingUpdateRequest,
  UserDto,
} from '@/lib/dto';
import {
  QueryClient,
  useMutation,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { deleteFromApi, fetchListFromApi, updateInApi } from '@/lib/fetch';
import {
  API_COURSES,
  API_TRAININGS,
  API_TRAININGS_DUPLICATES,
  API_USERS,
} from '@/lib/routes';
import { showError, showSuccess } from '@/lib/notifications';
import { replaceElementWithId } from '@/lib/sort-and-filter';

export function approveTrainingDeleteMutation(
  accessToken: string,
  invalidateCurrentTrainings: () => void,
) {
  return useMutation({
    mutationFn: (params: { training: TrainingDto; reason: string }) => {
      return deleteFromApi<TrainingDto>(
        API_TRAININGS,
        params.training,
        accessToken ?? '',
        { reason: params.reason },
      );
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

export function updateCompensationMutation(
  accessToken: string,
  queryClient: QueryClient,
  queryKeyForTrainings: string[],
) {
  return useMutation({
    mutationFn: (params: {
      training: TrainingDto;
      newCompensation: number;
      reason: string;
    }) => {
      const data: TrainingUpdateRequest = {
        ...params.training,
        compensationCents: params.newCompensation,
        reason: params.reason,
      };
      return updateInApi<TrainingDto>(
        API_TRAININGS,
        params.training.id,
        data,
        accessToken,
      );
    },
    onSuccess: (updated: TrainingDto) => {
      queryClient.setQueryData(queryKeyForTrainings, (oldData: TrainingDto[]) =>
        replaceElementWithId(oldData, updated),
      );
      showSuccess(`Training für ${updated.course!.name} aktualisiert`);
    },
    onError: (e) => {
      showError(`Fehler beim Aktualisieren des Trainings`, e.message);
    },
  });
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
