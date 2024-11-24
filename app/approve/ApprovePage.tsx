import React, { Suspense, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import dayjs from 'dayjs';
import { holidaysSuspenseQuery } from '@/lib/shared-queries';
import {
  coursesQuery,
  queryDuplicates,
  trainerQuery,
} from '@/app/approve/queries';
import {
  TrainingCreateRequest,
  TrainingDto,
  TrainingDuplicateDto,
  TrainingSummaryDto,
} from '@/lib/dto';
import Grid from '@mui/material/Grid2';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import { DatePicker } from '@mui/x-date-pickers';
import TrainerList from '@/app/approve/TrainerList';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { TrainingTable } from '@/app/approve/TrainingTable';
import { Typography } from '@mui/material';
import type { JanusSession } from '@/lib/auth';
import { EnterTrainingDialogForAdmins } from '@/app/approve/EnterTrainingDialogForAdmins';
import { showError } from '@/lib/notifications';
import { useConfirm } from 'material-ui-confirm';
import { dateToHumanReadable } from '@/lib/formatters';
import { TrainingStatus } from '@prisma/client';

function DateQuickSelection(props: {
  setDatePickerStart: (v: dayjs.Dayjs) => void;
  setDatePickerEnd: (v: dayjs.Dayjs) => void;
}) {
  return (
    <ButtonGroup>
      <Button
        onClick={() => {
          props.setDatePickerStart(dayjs().startOf('quarter'));
          props.setDatePickerEnd(dayjs().endOf('quarter'));
        }}
      >
        aktuelles Quartal
      </Button>
      <Button
        onClick={() => {
          props.setDatePickerStart(
            dayjs().subtract(1, 'quarter').startOf('quarter'),
          );
          props.setDatePickerEnd(
            dayjs().subtract(1, 'quarter').endOf('quarter'),
          );
        }}
      >
        letztes Quartal
      </Button>
    </ButtonGroup>
  );
}

export function ApprovePage(props: {
  session: JanusSession;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  trainerId: string | null;
  getTrainings: () => TrainingDto[];
  getTrainingSummaries: () => TrainingSummaryDto[];
  selectedTraining: TrainingDto | null;
  setSelectedTraining: (v: TrainingDto | null) => void;
  setTrainings: (v: TrainingDto[]) => void;
  deleteTraining: (v: TrainingDto) => void;
  createTraining: (v: TrainingCreateRequest) => void;
  approveTraining: (v: {
    trainings: TrainingDto[];
    trainingId: number;
  }) => void;
  revokeTraining: (v: { trainings: TrainingDto[]; trainingId: number }) => void;
}): React.ReactElement {
  const { session } = props;
  const pathname = usePathname();
  const { replace } = useRouter();

  const [datePickerStart, setDatePickerStart] = React.useState<dayjs.Dayjs>(
    props.startDate,
  );
  const [datePickerEnd, setDatePickerEnd] = React.useState<dayjs.Dayjs>(
    props.endDate,
  );
  const [showAddTrainingDialog, setShowAddTrainingDialog] =
    React.useState<boolean>(false);

  const [selectedTrainerId, setSelectedTrainerId] = React.useState<
    string | null
  >(props.trainerId);

  const { data: holidays } = holidaysSuspenseQuery(session.accessToken, [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
  ]);

  // update the search params when the filters have changed.
  useEffect(() => {
    const params = new URLSearchParams();
    if (datePickerStart) {
      params.set('startDate', datePickerStart.format('YYYY-MM-DD'));
    }
    if (datePickerEnd) {
      params.set('endDate', datePickerEnd.format('YYYY-MM-DD'));
    }
    if (selectedTrainerId) {
      params.set('trainerId', selectedTrainerId);
    } else {
      params.delete('trainerId');
    }
    replace(`${pathname}?${params.toString()}`);
  }, [datePickerStart, datePickerEnd, selectedTrainerId]);

  const confirm = useConfirm();
  const handleDeleteClick = (training: TrainingDto) => {
    confirm({
      title: 'Training löschen?',
      description: `Soll das Training "${training.course!.name}" vom ${dateToHumanReadable(training.date)} gelöscht werden?`,
    })
      .then(() => {
        props.deleteTraining(training);
        props.setSelectedTraining(null);
      })
      .catch((e: Error) => {
        showError('Fehler beim Löschen des Trainings', e.message);
      });
  };

  const getDuplicates = (trainingIds: number[]): TrainingDuplicateDto[] => {
    return queryDuplicates(session.accessToken, trainingIds).data;
  };

  return (
    <>
      <Grid container spacing={2}>
        <Grid size={{ xs: 3 }}></Grid>
        <Grid
          size={{ xs: 3 }}
          style={{ display: 'flex', alignItems: 'center' }}
        >
          <DateQuickSelection
            setDatePickerStart={setDatePickerStart}
            setDatePickerEnd={setDatePickerEnd}
          />
        </Grid>
        <Grid size={{ xs: 2 }}>
          <DatePicker
            label="Start"
            value={datePickerStart}
            onChange={(v) => {
              if (v && v.isValid()) {
                setDatePickerStart(v);
              }
            }}
          />
        </Grid>
        <Grid size={{ xs: 2 }}>
          <DatePicker
            label="Ende"
            value={datePickerEnd}
            onChange={(v) => {
              if (v && v.isValid()) {
                setDatePickerEnd(v);
              }
            }}
          />
        </Grid>
        <Grid size={{ xs: 2 }}></Grid>

        <Grid size={{ xs: 3 }}></Grid>
        <Grid size={{ xs: 1 }}>
          <Button onClick={() => setShowAddTrainingDialog(true)}>
            Hinzufügen
          </Button>
        </Grid>
        <Grid size={{ xs: 1 }}>
          <Button
            disabled={
              props.selectedTraining === null ||
              props.selectedTraining.status !== TrainingStatus.NEW
            }
            onClick={() => handleDeleteClick(props.selectedTraining!)}
          >
            Löschen
          </Button>
        </Grid>
        <Grid size={{ xs: 7 }}></Grid>

        <Grid size={{ xs: 3 }}>
          <TrainerList
            filterEnd={datePickerEnd}
            filterStart={datePickerStart}
            selectedTrainerId={selectedTrainerId}
            setSelectedTrainerId={setSelectedTrainerId}
            getTrainingSummaries={props.getTrainingSummaries}
          />
        </Grid>
        <Grid size={{ xs: 9 }}>
          {selectedTrainerId ? (
            <Suspense fallback={<LoadingSpinner />}>
              <TrainingTable
                holidays={holidays}
                getTrainings={props.getTrainings}
                getDuplicates={getDuplicates}
                setSelectedTraining={props.setSelectedTraining}
                approveTraining={props.approveTraining}
                revokeTraining={props.revokeTraining}
              />
            </Suspense>
          ) : (
            <Typography>Übungsleitung auswählen</Typography>
          )}
        </Grid>
      </Grid>

      <EnterTrainingDialogForAdmins
        open={showAddTrainingDialog}
        getTrainers={() => trainerQuery(session.accessToken).data}
        getCourses={(trainerId: string | null) =>
          coursesQuery(session.accessToken, trainerId).data
        }
        handleConfirm={props.createTraining}
        handleClose={() => {
          setShowAddTrainingDialog(false);
        }}
      />
    </>
  );
}
