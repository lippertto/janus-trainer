'use client';

import React, { useEffect } from 'react';

import TrainingTable from '../../components/TrainingTable';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '../../lib/auth';
import LoginRequired from '../../components/LoginRequired';
import { CompensationValue, Discipline, Holiday } from '@prisma/client';
import { TrainingDtoNew } from '@/lib/dto';
import { useQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_COMPENSATION_VALUES, API_DISCIPLINES, API_HOLIDAYS, API_TRAININGS } from '@/lib/routes';

function sortDiscipline(a: Discipline, b: Discipline): number {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

export default function EnterPage() {
  const [trainings, setTrainings] = React.useState<TrainingDtoNew[]>([]);
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [disciplines, setDisciplines] = React.useState<Discipline[]>([]);
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const compensationValuesResult = useQuery({
    queryKey: ['compensationValues'],
    queryFn: () => fetchListFromApi<CompensationValue>(
      API_COMPENSATION_VALUES,
      session.accessToken),
    throwOnError: true,
    enabled: !!session?.accessToken,
    initialData: [],
  });

  const disciplineResult = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => fetchListFromApi<Discipline>(
      API_DISCIPLINES,
      session.accessToken,
    ),
    throwOnError: true,
    enabled: !!session?.accessToken,
    initialData: [],
  });

  const holidayResult = useQuery({
    queryKey: ['holidays'],
    queryFn: () => fetchListFromApi<Holiday>(
      `${API_HOLIDAYS}?year=${new Date().getFullYear()},${new Date().getFullYear() - 1}`,
      session.accessToken,
    ),
    throwOnError: true,
    enabled: !!session?.accessToken,
    initialData: [],
  });

  const trainingResult = useQuery({
    queryKey: ['trainings'],
    queryFn: () => fetchListFromApi<TrainingDtoNew>(
      `${API_TRAININGS}?userId=${session.userId}`,
      session.accessToken,
    ),
    throwOnError: true,
    enabled: !!session?.accessToken,
    initialData: [],
  });

  useEffect(() => {
    if (!disciplineResult.isLoading && !disciplineResult.isError) {
      setDisciplines(disciplineResult.data);
    }
  }, [disciplineResult]);

  useEffect(() => {
    if (!holidayResult.isError && !holidayResult.isLoading) {
      setHolidays(holidayResult.data);
    }
  }, [holidayResult]);

  useEffect(() => {
    if (!trainingResult.isError && !trainingResult.isLoading) {
      setTrainings(trainingResult.data);
    }
  }, [trainingResult]);

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <TrainingTable
      trainings={trainings}
      disciplines={disciplines}
      holidays={holidays}
      setTrainings={setTrainings}
      refresh={() => {
        compensationValuesResult.refetch();
        disciplineResult.refetch();
        holidayResult.refetch();
        trainingResult.refetch();
      }}
      approvalMode={false}
      compensationValues={compensationValuesResult.data}
      data-testid="enter-training-table"
    />
  );
}
