'use client';

import React, { useEffect } from 'react';

import TrainingTable from '@/components/TrainingTable';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { CourseDto, HolidayDto, TrainingDto } from '@/lib/dto';
import { useQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_COURSES, API_HOLIDAYS, API_TRAININGS } from '@/lib/routes';
import { holidaysQuery } from '@/lib/shared-queries';


export default function EnterPage() {
  const [trainings, setTrainings] = React.useState<TrainingDto[]>([]);
  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);
  const [courses, setCourses] = React.useState<CourseDto[]>([]);
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const holidayResult = holidaysQuery(
    session?.accessToken,
    [new Date().getFullYear(), new Date().getFullYear() - 1],
  );

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
    },
  );

  useEffect(() => {
    if (!holidayResult.isError && !holidayResult.isLoading && !holidayResult.isRefetching) {
      setHolidays(holidayResult.data!);
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
