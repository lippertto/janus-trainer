'use client';

import React, { useEffect } from 'react';

import TrainingTable from '@/components/TrainingTable';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { HolidayDto, TrainingDto } from '@/lib/dto';
import { useQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_TRAININGS } from '@/lib/routes';
import { coursesForTrainerSuspenseQuery, holidaysQuery } from '@/lib/shared-queries';
import IconButton from '@mui/material/IconButton';
import HelpIcon from '@mui/icons-material/Help';
import Stack from '@mui/system/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

function EnterHelpText() {
  return <React.Fragment>
    <Typography>
      Auf dieser Seite kannst du die Trainings eingeben, die du gegeben hast.
    </Typography>
    <Typography>
      Um ein neues Training einzugeben, klick auf "Training hinzufügen".
      In der Eingabemaske kannst du die Kurse und Vergütungen auswählen, die das Büro für dich hinterlegt hat.
      Wenn du nichts auswählen kannst, ist nur ein Kurs und/oder eine Vergütung eingetragen.
    </Typography>
    <Typography>
      Wenn du das Training speichert, wird es vom Büro freigegeben, und am Ende des Quartals überwiesen.
      Du siehst den Status deines Trainings ganz rechts in der Tabelle unter der Spalte "Status".
    </Typography>
    <Typography>
      Um ein Training zu bearbeiten oder zu löschen, klicke erst auf die entsprechende Zeile und klicke dann auf
      "Löschen" oder "Bearbeiten".
      Freigegebene (oder überwiesene Kurse) können nicht mehr bearbeitet werden.
    </Typography>
  </React.Fragment>;
}

function EnterPageContents(props: { session: JanusSession }) {
  const [trainings, setTrainings] = React.useState<TrainingDto[]>([]);
  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);
  const [showHelp, setShowHelp] = React.useState(false);

  const { data: courses } = coursesForTrainerSuspenseQuery(
    props.session.userId,
    props.session.accessToken,
  );

  const holidayResult = holidaysQuery(
    props.session.accessToken,
    [new Date().getFullYear(), new Date().getFullYear() - 1],
  );

  const trainingResult = useQuery({
    queryKey: ['trainings'],
    queryFn: () => fetchListFromApi<TrainingDto>(
      `${API_TRAININGS}?trainerId=${props.session.userId}`,
      props.session.accessToken,
    ),
    throwOnError: true,
    initialData: [],
  });

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

  return (
    <Stack spacing={1}>
      <Box display="flex" justifyContent="flex-end">
        <IconButton aria-label={'Hilfe'} onClick={() => setShowHelp(!showHelp)}>
          <HelpIcon />
        </IconButton>
      </Box>
      {showHelp ? <EnterHelpText/> : null}

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
        session={props.session}
        data-testid="enter-training-table"
      />
    </Stack>
  );
}

export default function EnterPage() {
  const { data, status: authenticationStatus } = useSession();

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  const session = data as JanusSession;
  return <EnterPageContents session={session} />;
}