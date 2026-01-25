'use client';

import React, { useCallback } from 'react';
import Typography from '@mui/material/Typography';
import { Group, TrainerReportDto, UserDto, TrainingDto } from '@/lib/dto';
import Stack from '@mui/system/Stack';
import { Instructions } from '@/app/Instructions';
import { TrainerStatistics } from '@/app/TrainerStatistics';
import { useSession } from 'next-auth/react';
import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import {
  API_CONFIGURATION,
  API_TRAINER_REPORTS,
  API_USERS,
} from '@/lib/routes';
import dayjs from 'dayjs';
import { ConfigurationValueListResponse } from '@/lib/dto';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import Box from '@mui/material/Box';
import TrainingDialog from '@/components/TrainingDialog';
import {
  coursesForTrainerSuspenseQuery,
  userSuspenseQuery,
} from '@/lib/shared-queries';
import { intToDayOfWeek } from '@/lib/warnings-for-date';
import { customCostsQuery, trainingCreateQuery } from '@/app/enter/queries';

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
  const queryClient = useQueryClient();
  const [showTrainingDialog, setShowTrainingDialog] =
    React.useState<boolean>(false);

  const { data: userInfo } = useSuspenseQuery({
    queryKey: ['user', session.userId],
    queryFn: userInfoQueryFn,
    staleTime: 10 * 60 * 1000,
  });

  const isTrainer = userInfo.groups.includes(Group.TRAINERS);
  const showIbanWarning = isTrainer && !userInfo.iban;

  // Fetch required data for training dialog (only for trainers)
  const { data: courses } = isTrainer
    ? coursesForTrainerSuspenseQuery(session.userId, session.accessToken)
    : { data: [] };

  const { data: user } = isTrainer
    ? userSuspenseQuery(session.userId, session.accessToken, false, true, true)
    : { data: null };

  const createTrainingMutation = isTrainer
    ? trainingCreateQuery(session.accessToken, [], queryClient)
    : null;

  return (
    <React.Fragment>
      <Stack spacing={2}>
        {showIbanWarning && (
          <Typography color="error">
            Bitte die IBAN im Profil eintragen.
          </Typography>
        )}

        {isTrainer && (
          <Card>
            <CardActionArea
              onClick={() => setShowTrainingDialog(true)}
              data-testid="enter-training-card"
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <AddCircleOutlineIcon color="primary" fontSize="large" />
                  <Box>
                    <Typography variant="h6" component="div">
                      Training eingeben
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Erfasse ein neues Training
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
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

      {isTrainer && user && (
        <TrainingDialog
          open={showTrainingDialog}
          toEdit={null}
          courses={courses}
          compensationValues={user.compensationClasses!.flatMap(
            (cc) => cc.compensationValues!,
          )}
          today={intToDayOfWeek(new Date().getDay())}
          userId={session.userId}
          handleClose={() => setShowTrainingDialog(false)}
          handleSave={(data) => {
            createTrainingMutation?.mutate(data);
            setShowTrainingDialog(false);
          }}
          handleDelete={(v: TrainingDto) => {
            // Not applicable for new trainings
          }}
          getCustomCourses={() => {
            return customCostsQuery(session.accessToken).data;
          }}
        />
      )}
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
