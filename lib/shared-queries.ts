import { useMutation, useQuery, UseQueryResult, useSuspenseQuery } from '@tanstack/react-query';
import { createInApi, deleteFromApi, fetchListFromApi, fetchSingleEntity, updateInApi } from '@/lib/fetch';
import { API_COMPENSATION_VALUES, API_COURSES, API_HOLIDAYS, API_TRAININGS, API_USERS } from '@/lib/routes';
import {
  CompensationValueDto,
  CourseDto,
  TrainingCreateRequest,
  TrainingDto,
  TrainingUpdateRequest,
  UserDto,
} from '@/lib/dto';
import { Holiday } from '@prisma/client';
import { showError, showSuccess } from '@/lib/notifications';
import { compareByStringField } from '@/lib/sort-and-filter';
import { dateToHumanReadable } from '@/lib/formatters';

const TEN_MINUTES = 10 * 60 * 1000;

export function compensationValuesQuery(accessToken: string | null) {
  return useQuery({
    queryKey: ['compensationValues'],
    queryFn: () => fetchListFromApi<CompensationValueDto>(
      API_COMPENSATION_VALUES,
      accessToken!),
    throwOnError: true,
    enabled: Boolean(accessToken),
    staleTime: TEN_MINUTES,
  });
}

/**
 * Query for the holidays.
 *
 * @param accessToken
 * @param years Which years to include. Must not be empty
 */
export function holidaysQuery(
  accessToken: string | null,
  years: number[]) {

  if (years.length === 0) throw new Error('years must not be empty');

  const key = [API_HOLIDAYS, ...years];
  return useQuery({
    queryKey: key,
    queryFn: () => fetchListFromApi<Holiday>(
      `${API_HOLIDAYS}?year=${years.map((y) => (y.toString())).join(',')}`,
      accessToken!,
    ),
    throwOnError: true,
    enabled: Boolean(accessToken),
    staleTime: TEN_MINUTES,
  });
}

export function trainersQuery(accessToken: string | null) {
  return useQuery({
    queryKey: ['trainers'],
    queryFn: () => fetchListFromApi<UserDto>(
      `${API_USERS}?group=trainers`,
      accessToken!,
    ),
    throwOnError: true,
    enabled: Boolean(accessToken),
    staleTime: TEN_MINUTES,
  });
}

export function resultHasData(result: UseQueryResult) {
  if (result.isError || result.isLoading || result.isRefetching) {
    return false;
  }
  if (result.status === 'pending') {
    return false;
  }
  return true;
}

export function coursesForTrainerSuspenseQuery(userId: string, accessToken: string) {
  return useSuspenseQuery({
      queryKey: ['courses', userId],
      queryFn: () => fetchListFromApi<CourseDto>(
        `${API_COURSES}?trainerId=${userId}`,
        accessToken,
      ),
      staleTime: TEN_MINUTES,
    },
  );
}

export function compensationValuesSuspenseQuery(accessToken: string) {
  return useSuspenseQuery({
    queryKey: [API_COMPENSATION_VALUES],
    queryFn: () => fetchListFromApi<CompensationValueDto>(
      `${API_COMPENSATION_VALUES}`,
      accessToken,
    ),
    staleTime: 60 * 1000,
  });
}

export function userSuspenseQuery(userId: string, accessToken: string) {
  return useSuspenseQuery({
    queryKey: [API_USERS, userId],
    queryFn: () => fetchSingleEntity<UserDto>(API_USERS, userId, accessToken),
  });
}

export function trainingCreateQuery(
  accessToken: string,
  trainings: TrainingDto[],
  setTrainings: (v: TrainingDto[]) => void,
  sorting: "ASC" | "DESC" | "NONE" = "NONE",
  ) {
  return useMutation({
    mutationFn: (data: TrainingCreateRequest) => {
      return createInApi<TrainingDto>(API_TRAININGS, data, accessToken);
    },
    onSuccess: (createdTraining: TrainingDto) => {
      const newTrainings = [...trainings, createdTraining];
      if (sorting === "ASC") {
        newTrainings.sort((a, b) => (compareByStringField(a, b, "date")));
      } else if (sorting === "DESC") {
        newTrainings.sort((a, b) => (compareByStringField(b, a, "date")));
      }
      setTrainings(newTrainings);
      showSuccess(`Training für ${createdTraining.course.name} erstellt`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen des Trainings`, e.message);
    },
  });
}

export function trainingUpdateQuery(
  accessToken: string,
  trainings: TrainingDto[],
  setTrainings: (v: TrainingDto[]) => void,
  sorting: "ASC" | "DESC" | "NONE" = "NONE",
) {
  return useMutation({
      mutationFn: (props: { data: TrainingUpdateRequest, trainingId: number }) => {
        return updateInApi<TrainingDto>(API_TRAININGS, props.trainingId, props.data, accessToken);
      },
      onSuccess: (data: TrainingDto) => {
        const newTrainings = trainings.map((d) => {
          if (d.id === data.id) {
            return data;
          } else {
            return d;
          }
        });
        if (sorting === "ASC") {
          newTrainings.sort((a, b) => (compareByStringField(a, b, "date")));
        } else if (sorting === "DESC") {
          newTrainings.sort((a, b) => (compareByStringField(b, a, "date")));
        }
        setTrainings(newTrainings);
        showSuccess(`Training ${data.course.name} vom ${dateToHumanReadable(data.date)} aktualisiert`);
      },
      onError: (e) => {
        showError(`Fehler beim Aktualisieren des Trainings`, e.message);
      },
    },
  );
}

export function trainingDeleteQuery(
  accessToken: string,
  trainings: TrainingDto[],
  setTrainings: (v: TrainingDto[]) => void,
) {
  return useMutation({
    mutationFn: (t: TrainingDto) => {
      return deleteFromApi<TrainingDto>(API_TRAININGS, t, accessToken ?? '');
    },
    onSuccess: (deleted: TrainingDto) => {
      setTrainings(trainings.filter((t) => (t.id !== deleted.id)));
      showSuccess(`Training für ${deleted.course.name} gelöscht`);
    },
    onError: (e) => {
      showError(`Fehler beim Löschen des Trainings`, e.message);
    },
  });
}