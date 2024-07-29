'use client';

import React, { useEffect } from 'react';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { CompensationValueDto, TrainingDto } from '@/lib/dto';
import { useQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_TRAININGS } from '@/lib/routes';
import {
  compensationValuesSuspenseQuery,
  coursesForTrainerSuspenseQuery,
  holidaysSuspenseQuery,
  resultHasData,
  trainingCreateQuery,
  trainingDeleteQuery,
  trainingUpdateQuery,
  userSuspenseQuery,
} from '@/lib/shared-queries';
import Typography from '@mui/material/Typography';
import { CompensationGroup } from '@prisma/client';
import { TrainingList } from '@/app/enter/TrainingList';
import TrainingDialog from '@/app/enter/TrainingDialog';
import { compareByStringField } from '@/lib/sort-and-filter';
import { Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { LoadingSpinner } from '@/components/LoadingSpinner';

import 'core-js/modules/es.array.to-sorted';
import 'core-js/modules/es.array.to-reversed';


function allowedCompensationValues(values: CompensationValueDto[], groups: CompensationGroup[]) {
  return values.filter((v) => (groups.indexOf(v.compensationGroup) !== -1));
}

function EnterPageContents(props: { session: JanusSession }) {
  const { session } = props;
  const [trainings, setTrainings] = React.useState<TrainingDto[]>([]);
  const [trainingToEdit, setTrainingToEdit] = React.useState<TrainingDto | null>(null);
  const [showTrainingDialog, setShowTrainingDialog] = React.useState<boolean>(false);

  const { data: compensationValues } = compensationValuesSuspenseQuery(session.accessToken);
  const { data: courses } = coursesForTrainerSuspenseQuery(
    session.userId,
    session.accessToken,
  );
  const { data: user } = userSuspenseQuery(session.userId, session.accessToken);
  const { data: holidays } = holidaysSuspenseQuery(session.accessToken, [new Date().getFullYear(), new Date().getFullYear() - 1]);

  const createTrainingMutation = trainingCreateQuery(session.accessToken, trainings, setTrainings, 'DESC');
  const updateTrainingMutation = trainingUpdateQuery(session.accessToken, trainings, setTrainings, 'DESC');
  const deleteTrainingMutation = trainingDeleteQuery(session.accessToken, trainings, setTrainings);

  const trainingResult = useQuery({
    queryKey: [API_TRAININGS, `trainerId=${session.userId}`],
    queryFn: () => fetchListFromApi<TrainingDto>(
      `${API_TRAININGS}?trainerId=${session.userId}`,
      session.accessToken,
    ),
    throwOnError: true,
  });

  useEffect(() => {
    if (resultHasData(trainingResult)) {
      setTrainings(trainingResult.data!.toSorted((a, b) => compareByStringField(a, b, 'date')).toReversed());
    }
  }, [trainingResult.data]);

  if (trainingResult.data === undefined) {
    return <LoadingSpinner />;
  }

  return <React.Fragment>
      {trainings.length > 0 ?
        <TrainingList
          trainings={trainings}
          holidays={holidays}
          handleEdit={(v: TrainingDto) => {
            setTrainingToEdit(v);
            setShowTrainingDialog(true);
          }}
        />
        : <Typography>Noch keine Trainings eingetragen.</Typography>
      }

    <Fab
      color="primary"
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
      }}
      onClick={() => {
        setTrainingToEdit(null);
        setShowTrainingDialog(true);
      }}
      data-testid="enter-training-button"
    >
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