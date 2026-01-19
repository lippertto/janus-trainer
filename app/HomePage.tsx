'use client';

import React, { useCallback } from 'react';
import Typography from '@mui/material/Typography';
import { Group, TrainerReportDto, UserDto } from '@/lib/dto';
import Stack from '@mui/system/Stack';
import { Instructions } from '@/app/Instructions';
import { TrainerStatistics } from '@/app/TrainerStatistics';
import { useSession } from 'next-auth/react';
import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  API_CONFIGURATION,
  API_TRAINER_REPORTS,
  API_USERS,
} from '@/lib/routes';
import dayjs from 'dayjs';
import { ConfigurationValueListResponse } from '@/lib/dto';

interface HomePageContentsProps {
  session: JanusSession;
  userInfoQueryFn: () => Promise<UserDto>;
  trainerReportQueryFn: () => Promise<TrainerReportDto>;
  configurationQueryFn: () => Promise<ConfigurationValueListResponse>;
}

export function HomePageContents({
  session,
  userInfoQueryFn,
  trainerReportQueryFn,
  configurationQueryFn,
}: HomePageContentsProps) {
  const { data: userInfo } = useSuspenseQuery({
    queryKey: ['user', session.userId],
    queryFn: userInfoQueryFn,
    staleTime: 10 * 60 * 1000,
  });

  const isTrainer = userInfo.groups.includes(Group.TRAINERS);
  const showIbanWarning = isTrainer && !userInfo.iban;

  return (
    <React.Fragment>
      <Stack spacing={2}>
        {showIbanWarning && (
          <Typography color="error">
            Bitte die IBAN im Profil eintragen.
          </Typography>
        )}

        {isTrainer && (
          <TrainerStatistics
            trainerReportQueryFn={trainerReportQueryFn}
            configurationQueryFn={configurationQueryFn}
            userId={session.userId}
            year={dayjs().year()}
          />
        )}

        <Instructions />
      </Stack>
    </React.Fragment>
  );
}

export default function HomePage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const userInfoQueryFn = useCallback(async () => {
    if (!session) {
      return Promise.reject(new Error('No session'));
    }
    const response = await fetch(
      `${API_USERS}/${session.userId}?expand=cognito`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    if (response.status !== 200) {
      return Promise.reject(new Error('Failed to get user info'));
    }

    return (await response.json()) as UserDto;
  }, [session]);

  const trainerReportQueryFn = useCallback(async () => {
    if (!session) {
      return Promise.reject(new Error('No session'));
    }
    const startDate = dayjs().startOf('year');
    const endDate = dayjs().endOf('year');
    const params = new URLSearchParams();
    params.set('trainerId', session.userId);
    params.set('start', startDate.format('YYYY-MM-DD'));
    params.set('end', endDate.format('YYYY-MM-DD'));

    const response = await fetch(
      `${API_TRAINER_REPORTS}?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
        },
      },
    );

    if (response.status !== 200) {
      return Promise.reject(
        new Error(`Failed to get trainer report: ${await response.text()}`),
      );
    }

    return (await response.json()) as TrainerReportDto;
  }, [session]);

  const configurationQueryFn = useCallback(async () => {
    if (!session) {
      return Promise.reject(new Error('No session'));
    }
    const response = await fetch(API_CONFIGURATION, {
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
      },
    });

    if (response.status !== 200) {
      return Promise.reject(new Error('Failed to get configuration'));
    }

    return (await response.json()) as ConfigurationValueListResponse;
  }, [session]);

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <HomePageContents
      session={session}
      userInfoQueryFn={userInfoQueryFn}
      trainerReportQueryFn={trainerReportQueryFn}
      configurationQueryFn={configurationQueryFn}
    />
  );
}
