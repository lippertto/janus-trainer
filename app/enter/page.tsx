'use client';

import React, { useEffect } from 'react';

import TrainingTable from '@/components/TrainingTable';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { Holiday } from '@prisma/client';
import { CourseDto, TrainingDto } from '@/lib/dto';
import { useQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_COURSES, API_HOLIDAYS, API_TRAININGS } from '@/lib/routes';


export default function EnterPage() {
  const [trainings, setTrainings] = React.useState<TrainingDto[]>([]);
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [courses, setCourses] = React.useState<CourseDto[]>([]);
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

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
    queryFn: () => fetchListFromApi<TrainingDto>(
      `${API_TRAININGS}?userId=${session?.userId}`,
      session.accessToken,
    ),
    throwOnError: true,
    enabled: !!session?.accessToken,
    initialData: [],
  });

  const courseResult = useQuery({
      queryKey: ['courses', session?.userId],
      queryFn: () => fetchListFromApi<CourseDto>(
        `${API_COURSES}?trainerId=${session?.userId}`,
        session.accessToken,
      ),
      throwOnError: true,
      enabled: Boolean(session?.accessToken),
    }
  );

  useEffect(() => {
    if (!holidayResult.isError && !holidayResult.isLoading) {
      setHolidays(holidayResult.data);
    }
  }, [holidayResult]);

  useEffect(() => {
    if (!trainingResult.isError && !trainingResult.isLoading) {
      setTrainings(trainingResult.data);
    }
  }, [trainingResult.data]);

  useEffect(() => {
    if (!courseResult.isError && !courseResult.isLoading) {
      setCourses(courseResult.data!);
    }
  }, [courseResult.data]);


  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <TrainingTable
      trainings={trainings}
      holidays={holidays}
      setTrainings={setTrainings}
      courses={courses}
      refresh={() => {
        holidayResult.refetch();
        trainingResult.refetch();
      }}
      approvalMode={false}
      session={session}
      data-testid="enter-training-table"
    />
  );
}
