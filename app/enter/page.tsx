'use client';

import React from 'react';

import 'core-js/modules/es.array.to-sorted';
import 'core-js/modules/es.array.to-reversed';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { TrainingDto, TrainingDuplicateDto } from '@/lib/dto';
import { useQueryClient } from '@tanstack/react-query';
import {
  coursesForTrainerSuspenseQuery,
  holidaysSuspenseQuery,
  resultHasData,
  userSuspenseQuery,
} from '@/lib/shared-queries';
import Typography from '@mui/material/Typography';
import { TrainingList } from '@/app/enter/TrainingList';
import Fab from '@mui/material/Fab';
import AddIcon from '@mui/icons-material/Add';
import { compareByField } from '@/lib/sort-and-filter';
import TrainingDialog from '@/app/enter/TrainingDialog';
import { intToDayOfWeek } from '@/lib/warnings-for-date';
import dayjs from 'dayjs';
import Stack from '@mui/system/Stack';
import DateButton from '@/components/DateButton';
import {
  FIRST_DAY_OF_PREVIOUS_QUARTER,
  FIRST_DAY_OF_THIS_QUARTER,
  LAST_DAY_OF_PREVIOUS_QUARTER,
  LAST_DAY_OF_THIS_QUARTER,
} from '@/lib/helpers-for-date';
import {
  customCostsQuery,
  duplicatesQueryForEnterScreen,
  trainingCreateQuery,
  trainingDeleteQuery,
  trainingQueryForEnterScreen,
  trainingUpdateQuery,
} from '@/app/enter/queries';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import Button from '@mui/material/Button';

function EnterPageContents(props: { session: JanusSession }) {
  const { session } = props;
  const queryClient = useQueryClient();

  const [trainingToEdit, setTrainingToEdit] =
    React.useState<TrainingDto | null>(null);
  const [showTrainingDialog, setShowTrainingDialog] =
    React.useState<boolean>(false);

  const [duplicates, setDuplicates] = React.useState<TrainingDuplicateDto[]>(
    [],
  );

  const [startDate, setStartDate] = React.useState<dayjs.Dayjs>(
    FIRST_DAY_OF_THIS_QUARTER,
  );
  const [endDate, setEndDate] = React.useState<dayjs.Dayjs>(
    LAST_DAY_OF_THIS_QUARTER,
  );

  const [showAlert, setShowAlert] = React.useState<boolean>(false);

  const { data: courses } = coursesForTrainerSuspenseQuery(
    session.userId,
    session.accessToken,
  );
  const { data: user } = userSuspenseQuery(
    session.userId,
    session.accessToken,
    false,
    true,
    true,
  );
  const { data: holidays } = holidaysSuspenseQuery(session.accessToken, [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
  ]);

  const { data: trainings } = trainingQueryForEnterScreen(
    props.session.accessToken,
    startDate,
    endDate,
    props.session.userId,
  );
  trainings.sort((a, b) => compareByField(b, a, 'date'));

  const duplicateResult = duplicatesQueryForEnterScreen(
    session.accessToken,
    trainings.map((t) => t.id),
  );

  React.useEffect(() => {
    if (resultHasData(duplicateResult)) {
      setDuplicates(duplicateResult.data);
    }
  }, [duplicateResult]);

  const createTrainingMutation = trainingCreateQuery(
    session.accessToken,
    trainings,
    queryClient,
  );
  const updateTrainingMutation = trainingUpdateQuery(
    session.accessToken,
    trainings,
    queryClient,
  );
  const deleteTrainingMutation = trainingDeleteQuery(
    session.accessToken,
    trainings,
    queryClient,
  );

  return (
    <React.Fragment>
      <Stack>
        <DateButton
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          options={[
            {
              label: 'Letztes Quartal',
              start: FIRST_DAY_OF_PREVIOUS_QUARTER,
              end: LAST_DAY_OF_PREVIOUS_QUARTER,
            },
            {
              label: 'Aktuelles Quartal',
              start: FIRST_DAY_OF_THIS_QUARTER,
              end: LAST_DAY_OF_THIS_QUARTER,
            },
          ]}
        />

        {trainings.length > 0 ? (
          <TrainingList
            trainings={trainings}
            holidays={holidays}
            duplicates={duplicates}
            handleEdit={(v: TrainingDto) => {
              setTrainingToEdit(v);
              setShowTrainingDialog(true);
            }}
          />
        ) : (
          <Typography>
            Klicke auf das Plus rechts unten um ein Training hinzuzufügen.
          </Typography>
        )}
      </Stack>

      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => {
          // setTrainingToEdit(null);
          // setShowTrainingDialog(true);
          setShowAlert(true);
        }}
        data-testid="enter-training-button"
      >
        <AddIcon />
      </Fab>

      <Dialog
        open={showAlert}
        onClose={() => {
          setShowAlert(false);
        }}
      >
        <DialogContent>
          <DialogContentText>
            Du kannst aktuell keine neuen Stunden buchen, da die Pauschalen
            umgestellt werden. Voraussichtlich kannst du ab 16. Januar wieder
            Stunden eintragen.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowAlert(false)}>Okay</Button>
        </DialogActions>
      </Dialog>

      <TrainingDialog
        open={showTrainingDialog}
        toEdit={trainingToEdit}
        courses={courses}
        compensationValues={user.compensationClasses!.flatMap(
          (cc) => cc.compensationValues!,
        )}
        today={intToDayOfWeek(new Date().getDay())}
        userId={session.userId}
        handleClose={() => setShowTrainingDialog(false)}
        handleSave={
          trainingToEdit
            ? (data) => {
                updateTrainingMutation.mutate({
                  data,
                  trainingId: trainingToEdit.id,
                });
              }
            : createTrainingMutation.mutate
        }
        handleDelete={(v: TrainingDto) => {
          deleteTrainingMutation.mutate(v);
        }}
        getCustomCourses={() => {
          return customCostsQuery(props.session.accessToken).data;
        }}
      />
    </React.Fragment>
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
