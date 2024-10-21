import React from 'react';

import dayjs from 'dayjs';

import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRowId,
  GridRowParams,
  GridRowSelectionModel,
  GridToolbarContainer,
} from '@mui/x-data-grid';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FastForwardIcon from '@mui/icons-material/FastForward';

import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import Tooltip from '@mui/material/Tooltip';

import { JanusSession } from '@/lib/auth';

import { showError } from '@/lib/notifications';
import { Holiday, TrainingStatus } from '@prisma/client';
import { TrainingDto, TrainingDuplicateDto } from '@/lib/dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { patchInApi } from '@/lib/fetch';
import { API_TRAININGS, API_TRAININGS_SUMMARIZE } from '@/lib/routes';
import { useConfirm } from 'material-ui-confirm';
import {
  centsToHumanReadable,
  dateToHumanReadable,
  getDateFromIso8601,
  trainingStatusToHumanReadable,
} from '@/lib/formatters';
import { replaceElementWithId } from '@/lib/sort-and-filter';
import { warningsForDate } from '@/lib/warnings-for-date';
import { throttle } from 'throttle-debounce';
import {
  approveMutation,
  approveTrainingDeleteMutation,
  invalidateTrainingsForApprovePage,
  queryKeyForTrainings,
} from '@/app/approve/queries';

require('dayjs/locale/de');
dayjs.locale('de');

function buildGridColumns(
  holidays: Holiday[],
  duplicates: TrainingDuplicateDto[],
  handleApproveClick: { (id: GridRowId): () => void },
  handleRevokeClick: { (id: GridRowId): () => void },
): GridColDef[] {
  const renderWarnings = ({ row }: { row: TrainingDto }) => {
    const dateMessages = warningsForDate(
      row.date,
      holidays,
      row.course!.weekdays,
    );
    const duplicateMessages = duplicates
      .filter((dup) => dup.queriedId === row.id)
      .map(
        (dup) =>
          `Duplikat: ${dup.duplicateTrainerName} für ${dup.duplicateCourseName}`,
      );
    const warnings = dateMessages.concat(duplicateMessages);
    if (warnings.length !== 0) {
      return (
        <Tooltip title={warnings.join(', ')}>
          <WarningAmberIcon
            sx={{ color: 'orange' }}
            style={{ verticalAlign: 'middle' }}
          />
        </Tooltip>
      );
    }
    return null;
  };

  return [
    {
      field: 'date',
      headerName: 'Datum',
      type: 'date',
      valueFormatter: (value: string) => {
        return dateToHumanReadable(value);
      },
      valueGetter: (value: string) => getDateFromIso8601(value),
    },
    {
      field: 'warnings',
      headerName: '',
      renderCell: renderWarnings,
    },
    {
      field: 'userName',
      headerName: 'Übungsleitung',
      valueGetter: (_value, row: TrainingDto) => {
        return row.user?.name ?? '';
      },
    },
    {
      field: 'course',
      headerName: 'Kurs',
      valueGetter: (_value, row: TrainingDto) => {
        const hour = row.course?.startHour?.toString().padStart(2, '0') ?? '';
        const minute =
          row.course?.startMinute?.toString().padStart(2, '0') ?? '';
        if (row.course?.isCustomCourse) {
          return `${row.course?.name}`;
        } else {
          return `${row.course?.name} ${hour}:${minute}, ${row.course?.durationMinutes}min`;
        }
      },
    },
    {
      field: 'participantCount',
      headerName: 'Mitglieder',
      type: 'number',
    },
    {
      field: 'compensationCents',
      headerName: 'Pauschale',
      valueFormatter: (value: number) => centsToHumanReadable(value),
    },
    {
      field: 'status',
      headerName: 'Status',
      valueGetter: (value: TrainingStatus) =>
        trainingStatusToHumanReadable(value),
    },
    {
      field: 'createdAt',
      headerName: 'Erstellt',
      valueFormatter: (value) => dayjs(value).format('DD.MM.YYYY'),
    },
    {
      field: 'comment',
      headerName: 'Kommentar',
    },
    {
      field: 'approvalActions',
      type: 'actions',
      headerName: '',
      getActions: ({ id, row }: GridRowParams) => {
        switch (row.status) {
          case TrainingStatus.NEW:
            return [
              <GridActionsCellItem
                icon={<FastForwardIcon />}
                label={'freigeben'}
                onClick={handleApproveClick(id)}
                key="approve-button"
              />,
            ];
          case TrainingStatus.APPROVED:
            return [
              <GridActionsCellItem
                icon={<FastRewindIcon />}
                label={'zurückrufen'}
                onClick={handleRevokeClick(id)}
                key="revoke-button"
              />,
            ];
          case TrainingStatus.COMPENSATED:
            return [];
          default:
            return [];
        }
      },
    },
  ];
}

type TrainingTableToolbarProps = {
  handleAddTraining?: () => void;
  handleDelete?: () => void;
  handleEdit?: () => void;
};

declare module '@mui/x-data-grid' {
  // required for typechecking
  interface ToolbarPropsOverrides {
    handleAddTraining?: () => void;
    handleDelete?: () => void;
    handleEdit?: () => void;
  }
}

function TrainingTableToolbar({ handleDelete }: TrainingTableToolbarProps) {
  return (
    <GridToolbarContainer>
      <Button
        startIcon={<DeleteIcon />}
        disabled={!Boolean(handleDelete)}
        onClick={handleDelete}
      >
        löschen
      </Button>
    </GridToolbarContainer>
  );
}

function revokeMutation(
  session: JanusSession,
  setTrainings: (value: TrainingDto[]) => void,
  trainings: TrainingDto[],
  refresh: () => void,
) {
  return useMutation({
    mutationFn: (id: number) => {
      return patchInApi<TrainingDto>(
        API_TRAININGS,
        id,
        { status: 'NEW' },
        session.accessToken,
      );
    },
    onSuccess: (updated) => {
      setTrainings(replaceElementWithId(trainings, updated));
      refresh();
    },
    onError: (e) => {
      showError(`Fehler beim Widerruf der Freigabe`, e.message);
    },
  });
}

type TrainingTableProps = {
  /** List of holidays used to highlight collisions */
  holidays: Holiday[];
  session: JanusSession;
  trainerId: string | null;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  getTrainings: () => TrainingDto[];
  getDuplicates: (trainingIds: number[]) => TrainingDuplicateDto[];
};

/**
 * Renders a list of Trainings.
 *
 * The component keeps a separate state for the trainings so that we can immediately update the UI.
 * Every change to the trainings will trigger a refresh of the data from the server.
 * The refresh function has been throttled to keep the load low.
 */
export default function TrainingTable(props: TrainingTableProps) {
  const { holidays, session } = { ...props };
  const queryClient = useQueryClient();

  const [rowSelectionModel, setRowSelectionModel] =
    React.useState<GridRowSelectionModel>([]);
  const [activeTraining, setActiveTraining] =
    React.useState<TrainingDto | null>(null);

  const trainings = props.getTrainings();
  const duplicates = props.getDuplicates(trainings.map((t) => t.id));

  const refresh = throttle(
    3000,
    () => {
      invalidateTrainingsForApprovePage(
        queryClient,
        props.startDate,
        props.endDate,
        props.trainerId,
      );
      queryClient.invalidateQueries({
        queryKey: [API_TRAININGS_SUMMARIZE, props.startDate, props.endDate],
      });
    },
    { noLeading: true },
  );

  const setTrainings = (v: TrainingDto[]) =>
    queryClient.setQueryData(
      queryKeyForTrainings(props.startDate, props.endDate, props.trainerId),
      v,
    );

  const approveTrainingMutation = approveMutation(
    session.accessToken,
    trainings,
    setTrainings,
    refresh,
  );
  const revokeTrainingMutation = revokeMutation(
    session,
    setTrainings,
    trainings,
    refresh,
  );
  const deleteTrainingMutation = approveTrainingDeleteMutation(
    session.accessToken,
    trainings,
    (trainings: TrainingDto[]) => {
      setTrainings(trainings);
      refresh();
    },
  );

  const confirm = useConfirm();
  const handleDeleteClick = (training: TrainingDto) => {
    confirm({
      title: 'Training löschen?',
      description: `Soll das Training "${training.course!.name}" vom ${dateToHumanReadable(training.date)} gelöscht werden?`,
    })
      .then(() => {
        deleteTrainingMutation.mutate(training);
        refresh();
      })
      .catch(() => {
        showError('Fehler beim Löschen des Trainings');
      });
  };

  const columns = React.useMemo(
    () =>
      buildGridColumns(
        holidays,
        duplicates,
        (id: GridRowId) => () => approveTrainingMutation.mutate(id as number),
        (id: GridRowId) => () => revokeTrainingMutation.mutate(id as number),
      ),
    [holidays, duplicates],
  );

  return (
    <>
      <DataGrid
        initialState={{
          sorting: {
            sortModel: [{ field: 'date', sort: 'asc' }],
          },
        }}
        columns={columns}
        // rows should be sorted before we pass them on. Else, the rows might jump when their status is changed.
        rows={trainings}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={(newValue) => {
          if (newValue.length === 0) {
            setActiveTraining(null);
          } else {
            setActiveTraining(
              trainings.find((t) => t?.id === (newValue[0] as number)) ?? null,
            );
          }
          setRowSelectionModel(newValue);
        }}
        autosizeOnMount={true}
        autosizeOptions={{}}
        slots={{
          toolbar: TrainingTableToolbar,
        }}
        slotProps={{
          toolbar: {
            handleDelete:
              activeTraining && activeTraining.status === TrainingStatus.NEW
                ? () => handleDeleteClick(activeTraining)
                : undefined,
          },
        }}
        {...props}
      />
    </>
  );
}
