'use client';

import React, { useCallback } from 'react';
import Typography from '@mui/material/Typography';
import {
  ConfigurationValueListResponse,
  CourseDto,
  Group,
  TrainerReportDto,
  TrainingDto,
  UserDto,
} from '@/lib/dto';
import Stack from '@mui/system/Stack';
import { Instructions } from '@/app/Instructions';
import { TrainerStatistics } from '@/app/TrainerStatistics';
import { useSession } from 'next-auth/react';
import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import {
  API_CONFIGURATION,
  API_COURSES,
  API_TRAINER_REPORTS,
  API_USERS,
} from '@/lib/routes';
import dayjs from 'dayjs';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import Box from '@mui/material/Box';
import TrainingDialog from '@/components/TrainingDialog';
import { fetchUser } from '@/lib/shared-queries';
import { intToDayOfWeek } from '@/lib/warnings-for-date';
import { customCostsQuery, trainingCreateQuery } from '@/app/enter/queries';
import { EditIbanDialog } from '@/components/EditIbanDialog';
import { fetchListFromApi, patchInApi } from '@/lib/fetch';
import { showError, showSuccess } from '@/lib/notifications';

interface HomePageContentsProps {
  session: JanusSession;
  userInfoQueryFn: () => Promise<UserDto>;
  trainerReportQueryFn: () => Promise<TrainerReportDto>;
  configurationQueryFn: () => Promise<ConfigurationValueListResponse>;
  fetchCoursesForTrainerQueryFn: () => Promise<CourseDto[]>;
}

export function HomePageContents({
  session,
  userInfoQueryFn,
  trainerReportQueryFn,
  configurationQueryFn,
  fetchCoursesForTrainerQueryFn,
}: HomePageContentsProps) {
  const queryClient = useQueryClient();
  const [showTrainingDialog, setShowTrainingDialog] =
    React.useState<boolean>(false);
  const [showIbanDialog, setShowIbanDialog] = React.useState<boolean>(false);

  const { data: userInfo } = useSuspenseQuery({
    queryKey: ['user', session.userId],
    queryFn: userInfoQueryFn,
    staleTime: 10 * 60 * 1000,
  });

  const isTrainer = userInfo.groups.includes(Group.TRAINERS);
  const showIbanWarning = isTrainer && !userInfo.iban;

  const { data: courses } = isTrainer
    ? useSuspenseQuery({
        queryKey: ['courses-for-trainer', session.userId],
        queryFn: () => fetchCoursesForTrainerQueryFn(),
        staleTime: 10 * 60 * 1000,
      })
    : { data: [] };

  const createTrainingMutation = isTrainer
    ? trainingCreateQuery(session.accessToken, [], queryClient)
    : null;

  const updateIbanMutation = useMutation({
    mutationFn: (iban: string) =>
      patchInApi<UserDto>(
        API_USERS,
        session.userId,
        { iban },
        session.accessToken,
      ),
    onSuccess: (_) => {
      showSuccess(`IBAN aktualisiert`);
      queryClient.invalidateQueries({ queryKey: ['user', session.userId] });
    },
    onError: (e) => {
      showError('Konnte IBAN nicht aktualisieren', e.message);
    },
  });

  return (
    <React.Fragment>
      <Stack spacing={2}>
        {showIbanWarning && (
          <Card sx={{ bgcolor: 'warning.light' }}>
            <CardActionArea
              onClick={() => setShowIbanDialog(true)}
              data-testid="iban-warning-card"
            >
              <CardContent>
                <Box display="flex" alignItems="center" gap={2}>
                  <WarningAmberIcon color="warning" fontSize="large" />
                  <Box>
                    <Typography variant="h6" component="div">
                      IBAN fehlt
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Hier klicken um deine IBAN einzutragen.
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
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

      {isTrainer && userInfo && (
        <TrainingDialog
          open={showTrainingDialog}
          toEdit={null}
          courses={courses}
          compensationValues={userInfo.compensationClasses!.flatMap(
            (cc) => cc.compensationValues!,
          )}
          today={intToDayOfWeek(new Date().getDay())}
          userId={session.userId}
          handleClose={() => setShowTrainingDialog(false)}
          handleSave={(data) => {
            createTrainingMutation?.mutate(data);
            setShowTrainingDialog(false);
          }}
          handleDelete={(_: TrainingDto) => {
            // Not applicable for new trainings
          }}
          getCustomCourses={() => {
            return customCostsQuery(session.accessToken).data;
          }}
        />
      )}

      {isTrainer && (
        <EditIbanDialog
          open={showIbanDialog}
          handleClose={() => setShowIbanDialog(false)}
          handleConfirm={(iban) => {
            updateIbanMutation.mutate(iban);
            setShowIbanDialog(false);
          }}
          initialValue={userInfo.iban}
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
    return fetchUser(session.accessToken, session.userId, {
      includeCognitoProperties: true,
      expandCompensationClasses: true,
      expandCompensationValues: false,
    });
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

  const fetchCoursesForTrainerQueryFn = useCallback(() => {
    if (!session) {
      return Promise.reject(new Error('No session'));
    }

    return fetchListFromApi<CourseDto>(
      `${API_COURSES}?trainerId=${session.userId}`,
      session.accessToken,
    );
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
      fetchCoursesForTrainerQueryFn={fetchCoursesForTrainerQueryFn}
    />
  );
}
