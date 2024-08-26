'use client';

import React from 'react';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { TrainingDto } from '@/lib/dto';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { API_TRAININGS } from '@/lib/routes';
import { coursesForTrainerSuspenseQuery, holidaysSuspenseQuery, userSuspenseQuery } from '@/lib/shared-queries';
import Typography from '@mui/material/Typography';
import { TrainingList } from '@/app/enter/TrainingList';
import TrainingDialog from '@/app/enter/TrainingDialog';
import { Fab } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

import 'core-js/modules/es.array.to-sorted';
import 'core-js/modules/es.array.to-reversed';
import { trainingCreateQuery, trainingDeleteQuery, trainingUpdateQuery } from '@/lib/queries-training';
import { compareByField } from '@/lib/sort-and-filter';
import { fetchListFromApi } from '@/lib/fetch';


function EnterPageContents(props: { session: JanusSession }) {
  const { session } = props;
  const queryClient = useQueryClient();
  const queryKey = [API_TRAININGS, `trainerId=${session.userId}`];
  const [trainingToEdit, setTrainingToEdit] = React.useState<TrainingDto | null>(null);
  const [showTrainingDialog, setShowTrainingDialog] = React.useState<boolean>(false);

  const { data: courses } = coursesForTrainerSuspenseQuery(session.userId, session.accessToken);
  const { data: user } = userSuspenseQuery(session.userId, session.accessToken, false, true, true);
  const { data: holidays } = holidaysSuspenseQuery(session.accessToken, [new Date().getFullYear(), new Date().getFullYear() - 1]);

  const { data: trainings } = useSuspenseQuery({
    queryKey,
    queryFn: () => fetchListFromApi<TrainingDto>(
      `${API_TRAININGS}?trainerId=${(session.userId)}`,
      session.accessToken,
    ),
  });
  trainings.sort((a, b) => (compareByField(b, a, 'date')));

  const updateQueryData = (trainings: TrainingDto[]) => {
    queryClient.setQueryData(queryKey, trainings);
  };

  const createTrainingMutation = trainingCreateQuery(session.accessToken, trainings, updateQueryData);
  const updateTrainingMutation = trainingUpdateQuery(session.accessToken, trainings, updateQueryData);
  const deleteTrainingMutation = trainingDeleteQuery(session.accessToken, trainings, updateQueryData);

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
      compensationValues={user.compensationClasses!.flatMap((cc) => (cc.compensationValues!))}
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