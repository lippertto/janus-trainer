'use client';

import React, { useEffect } from 'react';

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
  resultHasData,
  trainingCreateQuery,
  trainingDeleteQuery,
  trainingUpdateQuery, userSuspenseQuery,
} from '@/lib/shared-queries';
import Stack from '@mui/system/Stack';
import Typography from '@mui/material/Typography';
import { CompensationGroup } from '@prisma/client';
import { TrainingList } from '@/app/enter/TrainingList';
import TrainingDialog from '@/components/TrainingDialog';
import Paper from '@mui/material/Paper';
import { compareByStringField } from '@/lib/sort-and-filter';
import { Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';


function allowedCompensationValues(values: CompensationValueDto[], groups: CompensationGroup[]) {
  return values.filter((v) => (groups.indexOf(v.compensationGroup) !== -1));
}

function EnterHelpText() {
  return <React.Fragment>
    <Typography>
      Auf dieser Seite kannst du die Trainings eingeben, die du gegeben hast.
    </Typography>
    <Typography>
      Um ein neues Training einzugeben, klick auf "Training hinzufügen".
      In der Eingabemaske kannst du die Kurse und Pauschalen auswählen, die das Büro für dich hinterlegt hat.
      Wenn etwas fehlt, melde dich bitte beim Büro.
    </Typography>
    <Typography>
      Wenn du das Training speichert, wird es vom Büro freigegeben, und die zugehören Pauschale am Ende des Quartals
      gesammelt überwiesen.
      Du siehst den Status deines Trainings ganz rechts in der Tabelle unter der Spalte "Status".
    </Typography>
    <Typography>
      Um ein Training zu bearbeiten oder zu löschen, klicke erst auf die entsprechende Zeile und dann auf
      "Löschen" oder "Bearbeiten".
      Kurse, die schon freigegeben oder überwiesen worden sind, können nicht mehr bearbeitet werden.
    </Typography>
  </React.Fragment>;
}

function EnterPageContents(props: { session: JanusSession }) {
  const { session } = props;
  const [trainings, setTrainings] = React.useState<TrainingDto[]>([]);
  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);
  const [showHelp, setShowHelp] = React.useState(false);
  const [trainingToEdit, setTrainingToEdit] = React.useState<TrainingDto | null>(null);
  const [showTrainingDialog, setShowTrainingDialog] = React.useState<boolean>(false);

  const { data: compensationValues } = compensationValuesSuspenseQuery(session.accessToken);
  const { data: courses } = coursesForTrainerSuspenseQuery(
    session.userId,
    session.accessToken,
  );
  const { data: user } = userSuspenseQuery(session.userId, session.accessToken);

  const createTrainingMutation = trainingCreateQuery(session.accessToken, trainings, setTrainings, 'DESC');
  const updateTrainingMutation = trainingUpdateQuery(session.accessToken, trainings, setTrainings, 'DESC');
  const deleteTrainingMutation = trainingDeleteQuery(session.accessToken, trainings, setTrainings);

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
      setTrainings(trainingResult.data.toSorted((a, b) => compareByStringField(a, b, 'date')).toReversed());
    }
  }, [trainingResult.data]);


  return <React.Fragment>
    <Stack spacing={1}>

      <Paper>
        {trainings.length > 0 ?
        <TrainingList
          trainings={trainings}
          holidays={holidays}
          handleEdit={(v) => {
            setTrainingToEdit(v);
            setShowTrainingDialog(true);
          }}
        />
          : "Noch keine Trainings eingetragen."
        }
      </Paper>
    </Stack>

    <Fab
      color="primary"
      sx={{
        position: 'absolute',
        bottom: 16,
        right: 16,
      }}
      onClick={() => {
        setTrainingToEdit(null);
        setShowTrainingDialog(true);
      }}>
      <AddIcon />
    </Fab>

    <TrainingDialog
      compensationValues={allowedCompensationValues(compensationValues, user.compensationGroups)}
      courses={courses}
      userId={session.userId}
      open={showTrainingDialog}
      toEdit={trainingToEdit}
      handleClose={() => {
        setShowTrainingDialog(false);
        setTimeout(() => {
          setTrainingToEdit(null);
        }, 300);
      }}
      handleSave={
        trainingToEdit ? (data) => {
            updateTrainingMutation.mutate({ data, trainingId: trainingToEdit.id });
          } :
          createTrainingMutation.mutate
      }
      handleDelete={
        trainingToEdit ? (v: TrainingDto) => {
          deleteTrainingMutation.mutate(v);
        } : undefined
      }
    />
  </React.Fragment>

    ;
}

export default function EnterPage() {
  const { data, status: authenticationStatus } = useSession();

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  const session = data as JanusSession;
  return <EnterPageContents session={session} />;
}