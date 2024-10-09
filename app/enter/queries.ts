import dayjs from 'dayjs';
import {
  QueryClient,
  useMutation,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query';
import {
  createInApi,
  deleteFromApi,
  fetchListFromApi,
  updateInApi,
} from '@/lib/fetch';
import {
  CompensationClassDto,
  CourseDto,
  TrainingCreateRequest,
  TrainingDto,
  TrainingDuplicateDto,
  TrainingUpdateRequest,
} from '@/lib/dto';
import {
  API_COMPENSATION_CLASSES,
  API_COURSES,
  API_TRAININGS,
  API_TRAININGS_DUPLICATES,
} from '@/lib/routes';
import {
  FIRST_DAY_OF_PREVIOUS_QUARTER,
  isCurrentQuarter,
  isPreviousQuarter,
  LAST_DAY_OF_PREVIOUS_QUARTER,
} from '@/lib/helpers-for-date';
import { replaceElementWithId } from '@/lib/sort-and-filter';
import { showError, showSuccess } from '@/lib/notifications';
import { dateToHumanReadable } from '@/lib/formatters';

const QUERY_KEY_PREFIX = 'enter-screen-trainings';
const QUERY_KEY_CUSTOM = 'custom';
const PREVIOUS_QUARTER = 'previous-quarter';
const CURRENT_QUARTER = 'current-quarter';

enum Timeframe {
  CURRENT,
  PREVIOUS,
  CUSTOM,
}

function determineTimeframeForDate(dateString: string): Timeframe {
  const date = dayjs(dateString);
  if (date.isAfter(LAST_DAY_OF_PREVIOUS_QUARTER)) {
    return Timeframe.CURRENT;
  } else if (date.isAfter(FIRST_DAY_OF_PREVIOUS_QUARTER)) {
    return Timeframe.PREVIOUS;
  } else {
    return Timeframe.CUSTOM;
  }
}

function determineTimeframeForDates(
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
): Timeframe {
  if (isCurrentQuarter(startDate, endDate)) {
    return Timeframe.CURRENT;
  } else if (isPreviousQuarter(startDate, endDate)) {
    return Timeframe.PREVIOUS;
  } else {
    return Timeframe.CUSTOM;
  }
}

const QUERY_KEY_CURRENT_QUARTER = [QUERY_KEY_PREFIX, CURRENT_QUARTER];

const QUERY_KEY_PREVIOUS_QUARTER = [QUERY_KEY_PREFIX, PREVIOUS_QUARTER];

function determineQueryKey(
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
): string[] {
  const timeframe = determineTimeframeForDates(startDate, endDate);
  switch (timeframe) {
    case Timeframe.CURRENT:
      return QUERY_KEY_CURRENT_QUARTER;
    case Timeframe.PREVIOUS:
      return QUERY_KEY_PREVIOUS_QUARTER;
    case Timeframe.CUSTOM:
      return [
        QUERY_KEY_PREFIX,
        QUERY_KEY_CUSTOM,
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD'),
      ];
  }
}

export function trainingQueryForEnterScreen(
  accessToken: string,
  startDate: dayjs.Dayjs,
  endDate: dayjs.Dayjs,
  trainerId: string,
) {
  const params = new URLSearchParams();
  params.set('trainerId', trainerId);
  params.set('start', startDate.format('YYYY-MM-DD'));
  params.set('end', endDate.format('YYYY-MM-DD'));

  const queryKey = determineQueryKey(startDate, endDate);

  return useSuspenseQuery({
    queryKey: queryKey,
    queryFn: () =>
      fetchListFromApi<TrainingDto>(
        `${API_TRAININGS}?${params.toString()}`,
        accessToken!,
      ),
    staleTime: 10 * 60 * 1000,
  });
}

function updateTrainingsInQueryClient(
  trainings: TrainingDto[],
  dateString: string,
  queryClient: QueryClient,
) {
  switch (determineTimeframeForDate(dateString)) {
    case Timeframe.CUSTOM:
      break;
    case Timeframe.CURRENT:
      queryClient.setQueryData(QUERY_KEY_CURRENT_QUARTER, trainings);
      break;
    case Timeframe.PREVIOUS:
      queryClient.setQueryData(QUERY_KEY_PREVIOUS_QUARTER, trainings);
      break;
  }
}

export function trainingDeleteQuery(
  accessToken: string,
  trainings: TrainingDto[],
  queryClient: QueryClient,
) {
  return useMutation({
    mutationFn: (t: TrainingDto) => {
      return deleteFromApi<TrainingDto>(API_TRAININGS, t, accessToken ?? '');
    },
    onSuccess: (deleted: TrainingDto) => {
      const newTrainings = trainings.filter((t) => t.id !== deleted.id);
      updateTrainingsInQueryClient(newTrainings, deleted.date, queryClient);
      showSuccess(`Training für ${deleted.course!.name} gelöscht`);
    },
    onError: (e) => {
      showError(`Fehler beim Löschen des Trainings`, e.message);
    },
  });
}

export function trainingUpdateQuery(
  accessToken: string,
  trainings: TrainingDto[],
  queryClient: QueryClient,
) {
  return useMutation({
    mutationFn: (props: {
      data: TrainingUpdateRequest;
      trainingId: number;
    }) => {
      return updateInApi<TrainingDto>(
        API_TRAININGS,
        props.trainingId,
        props.data,
        accessToken,
      );
    },
    onSuccess: (udpated: TrainingDto) => {
      const newTrainings = replaceElementWithId(trainings, udpated);
      updateTrainingsInQueryClient(newTrainings, udpated.date, queryClient);

      showSuccess(
        `Training ${udpated.course!.name} vom ${dateToHumanReadable(udpated.date)} aktualisiert`,
      );
    },
    onError: (e) => {
      showError(`Fehler beim Aktualisieren des Trainings`, e.message);
    },
  });
}

export function trainingCreateQuery(
  accessToken: string,
  trainings: TrainingDto[],
  queryClient: QueryClient,
) {
  return useMutation({
    mutationFn: (data: TrainingCreateRequest) => {
      return createInApi<TrainingDto>(API_TRAININGS, data, accessToken);
    },
    onSuccess: (created: TrainingDto) => {
      const newTrainings = [...trainings, created];
      updateTrainingsInQueryClient(newTrainings, created.date, queryClient);
      showSuccess(`Training für ${created.course!.name} erstellt`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen des Trainings`, e.message);
    },
  });
}

export function customCostsQuery(accessToken: string) {
  return useSuspenseQuery({
    queryKey: ['ENTER', 'custom-costs'],
    queryFn: () =>
      fetchListFromApi<CourseDto>(`${API_COURSES}?custom=true`, accessToken!),
    staleTime: 10 * 60 * 1000,
  });
}

export function duplicatesQueryForEnterScreen(
  accessToken: string,
  trainingIds: number[],
) {
  return useQuery({
    queryKey: ['ENTER', trainingIds],
    queryFn: () =>
      fetchListFromApi<TrainingDuplicateDto>(
        `${API_TRAININGS_DUPLICATES}?trainingIds=${trainingIds.join(',')}`,
        accessToken,
        'POST',
      ),
    enabled: trainingIds.length > 0,
    initialData: [],
  });
}
