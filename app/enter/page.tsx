'use client';

import React, { useEffect } from 'react';

import TrainingTable from '@/components/TrainingTable';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { CompensationValueDto, HolidayDto, TrainingDto } from '@/lib/dto';
import { useQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_TRAININGS } from '@/lib/routes';
import {
  compensationValuesSuspenseQuery,
  coursesForTrainerSuspenseQuery,
  holidaysQuery,
  resultHasData, userSuspenseQuery,
} from '@/lib/shared-queries';
import IconButton from '@mui/material/IconButton';
import HelpIcon from '@mui/icons-material/Help';
import Stack from '@mui/system/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { CompensationGroup } from '@prisma/client';


function allowedCompensationValues(values: CompensationValueDto[], groups: CompensationGroup[]) {
  return values.filter((v) => (groups.indexOf(v.compensationGroup) !== -1))
}

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
  const {session} = props;
  const [trainings, setTrainings] = React.useState<TrainingDto[]>([]);
  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);
  const [showHelp, setShowHelp] = React.useState(false);

  const { data: user } = userSuspenseQuery(session.userId, session.accessToken);
  const { data: compensationValues } = compensationValuesSuspenseQuery(session.accessToken);
  const { data: courses } = coursesForTrainerSuspenseQuery(
    session.userId,
    session.accessToken,
  );

  const holidayResult = holidaysQuery(
    session.accessToken,
    [new Date().getFullYear(), new Date().getFullYear() - 1],
  );

  const trainingResult = useQuery({
    queryKey: [API_TRAININGS, `trainerId=${session.userId}`],
    queryFn: () => fetchListFromApi<TrainingDto>(
      `${API_TRAININGS}?trainerId=${session.userId}`,
      session.accessToken,
    ),
    throwOnError: true,
    initialData: [],
  });

  useEffect(() => {
    if (resultHasData(holidayResult)) {
      setHolidays(holidayResult.data!);
    }
  }, [holidayResult.data]);

  useEffect(() => {
    if (resultHasData(trainingResult)) {
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
      {showHelp ? <EnterHelpText /> : null}

      <TrainingTable
        trainings={trainings}
        holidays={holidays}
        compensationValues={allowedCompensationValues(compensationValues, user.compensationGroups)}
        setTrainings={(t) => {
          setTrainings(t);
        }}
        courses={courses}
        approvalMode={false}
        session={session}
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