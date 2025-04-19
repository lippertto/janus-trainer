'use client';
import React from 'react';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import dayjs from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import { useSearchParams } from 'next/navigation';
import { ApprovePage } from '@/app/approve/ApprovePage';
import {
  TrainingCreateRequest,
  TrainingDto,
  TrainingSummaryDto,
} from '@/lib/dto';
import { approveTrainingDeleteMutation } from '@/app/approve/queries';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { createInApi, fetchListFromApi, patchInApi } from '@/lib/fetch';
import { API_TRAININGS, API_TRAININGS_SUMMARIZE } from '@/lib/routes';
import { showError, showSuccess } from '@/lib/notifications';
import { throttle } from 'throttle-debounce';
import {
  compareByField,
  compareNamed,
  replaceElementWithId,
} from '@/lib/sort-and-filter';
import { TrainingStatus } from '@prisma/client';

dayjs.extend(quarterOfYear);

const QUERY_PARAM_START = 'startDate';
const QUERY_PARAM_END = 'endDate';
const QUERY_PARAM_TRAINER_ID = 'trainerId';

function fetchTrainingsFromApi(
  accessToken: string,
  filterStart: dayjs.Dayjs,
  filterEnd: dayjs.Dayjs,
  trainerId: string | null,
) {
  const params = new URLSearchParams();
  params.set('expand', 'user');
  if (trainerId) {
    params.set('trainerId', trainerId);
  }

  params.set('start', filterStart.format('YYYY-MM-DD'));
  params.set('end', filterEnd.format('YYYY-MM-DD'));

  return fetchListFromApi<TrainingDto>(
    `${API_TRAININGS}?${params.toString()}`,
    accessToken!,
  );
}

function updateStatusMutation(
  accessToken: string,
  setTrainings: (v: TrainingDto[]) => void,
  refresh: () => void,
  newStatus: TrainingStatus,
  errorMessage: string,
) {
  return useMutation({
    mutationFn: async ({
      trainingId,
      trainings,
    }: {
      trainingId: number;
      trainings: TrainingDto[];
    }) => {
      const updated = await patchInApi<TrainingDto>(
        API_TRAININGS,
        trainingId,
        { status: newStatus },
        accessToken,
      );
      return { updated, trainings };
    },
    onSuccess: ({
      updated,
      trainings,
    }: {
      updated: TrainingDto;
      trainings: TrainingDto[];
    }) => {
      setTrainings(replaceElementWithId(trainings, updated));
      refresh();
    },
    onError: (e) => {
      showError(errorMessage, e.message);
    },
  });
}

function fetchTrainingSummaries(
  accessToken: string,
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
) {
  return fetchListFromApi<TrainingSummaryDto>(
    `${API_TRAININGS_SUMMARIZE}?startDate=${start.format('YYYY-MM-DD')}&endDate=${end.format('YYYY-MM-DD')}`,
    accessToken,
    'POST',
  );
}

function createTrainingMutation(
  accessToken: string,
  invalidateTrainings: () => Promise<void>,
) {
  return useMutation({
    mutationFn: (data: TrainingCreateRequest) => {
      return createInApi<TrainingDto>(API_TRAININGS, data, accessToken);
    },
    onSuccess: async (createdTraining) => {
      showSuccess(
        `Training für den ${dayjs(createdTraining.date).format('DD.MM.YYYY')} wurde erstellt`,
      );
      await invalidateTrainings();
    },
    onError: (e: Error) => {
      showError('Konnte Training nicht erzeugen.', e.message);
    },
  });
}

export default function ApprovePageContainer() {
  const [selectedTraining, setSelectedTraining] =
    React.useState<TrainingDto | null>(null);
  const queryClient = useQueryClient();

  const searchParams = useSearchParams();
  const queryParamStart = searchParams.get(QUERY_PARAM_START)
    ? dayjs(searchParams.get(QUERY_PARAM_START))
    : dayjs().startOf('quarter');
  const queryParamEnd = searchParams.get(QUERY_PARAM_END)
    ? dayjs(searchParams.get(QUERY_PARAM_END))
    : dayjs().endOf('quarter');
  const queryParamTrainerId = searchParams.get(QUERY_PARAM_TRAINER_ID);

  const queryKeyForTrainings = [
    'APPROVE',
    'trainings',
    queryParamStart,
    queryParamEnd,
    queryParamTrainerId,
  ];

  const queryKeyForSummaries = [
    'APPROVE',
    'summaries',
    queryParamStart,
    queryParamEnd,
  ];

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const getTrainings = () => {
    return useSuspenseQuery({
      queryKey: queryKeyForTrainings,
      queryFn: () =>
        fetchTrainingsFromApi(
          session!.accessToken,
          queryParamStart,
          queryParamEnd,
          queryParamTrainerId,
        ),
      staleTime: 10 * 60 * 1000,
    }).data.toSorted((a, b) => compareByField(a, b, 'id'));
  };

  const getTrainingSummaries = () => {
    return useSuspenseQuery({
      queryKey: queryKeyForSummaries,
      queryFn: () =>
        fetchTrainingSummaries(
          session?.accessToken ?? '',
          queryParamStart,
          queryParamEnd,
        ),
      staleTime: 10 * 60 * 1000,
    }).data.toSorted((a, b) => compareByField(a, b, 'trainerName'));
  };

  const setTrainings = (v: TrainingDto[]) =>
    queryClient.setQueryData(queryKeyForTrainings, v);

  const invalidateDisplayQueries = async () => {
    await queryClient.invalidateQueries({ queryKey: ['APPROVE', 'trainings'] });
  };

  const deletionMutation = approveTrainingDeleteMutation(
    session?.accessToken ?? '',
    invalidateDisplayQueries,
  );

  const handleDelete = (reason: string) => {
    if (!selectedTraining) return;
    deletionMutation.mutate({ training: selectedTraining, reason: reason });
    setSelectedTraining(null);
  };

  const createMutation = createTrainingMutation(
    session?.accessToken ?? '',
    invalidateDisplayQueries,
  );

  // we refresh after a status has changed.
  const refreshAfterStatusChange = throttle(
    3000,
    () => {
      // throttle-debounce does not allow for async callbacks.
      queryClient.invalidateQueries({
        queryKey: queryKeyForTrainings,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeyForSummaries,
      });
    },
    { noLeading: true },
  );

  const approveTrainingMutation = updateStatusMutation(
    session?.accessToken ?? '',
    setTrainings,
    refreshAfterStatusChange,
    'APPROVED',
    'Fehler beim Freigeben des Trainings',
  );
  const revokeTrainingMutation = updateStatusMutation(
    session?.accessToken ?? '',
    setTrainings,
    refreshAfterStatusChange,
    'NEW',
    'Fehler bei beim Zurücknehmen der Freigabe',
  );

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <ApprovePage
      session={session}
      startDate={queryParamStart}
      endDate={queryParamEnd}
      trainerId={queryParamTrainerId}
      setSelectedTraining={setSelectedTraining}
      selectedTraining={selectedTraining}
      getTrainings={getTrainings}
      setTrainings={setTrainings}
      onDelete={handleDelete}
      createTraining={createMutation.mutate}
      approveTraining={approveTrainingMutation.mutate}
      revokeTraining={revokeTrainingMutation.mutate}
      getTrainingSummaries={getTrainingSummaries}
    />
  );
}
