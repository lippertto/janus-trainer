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
import { TrainingDto } from '@/lib/dto';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { fetchListFromApi, patchInApi } from '@/lib/fetch';
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
import { trainingDeleteQuery } from '@/lib/queries-training';

require('dayjs/locale/de');
dayjs.locale('de');

function buildGridColumns(
  holidays: Holiday[],
  handleApproveClick: { (id: GridRowId): () => void },
  handleRevokeClick: { (id: GridRowId): () => void },
): GridColDef[] {
  return [
    {
      field: 'date',
      headerName: 'Datum',
      type: 'date',
      flex: 1.1,
      valueFormatter: (value: string) => {
        return dateToHumanReadable(value);
      },
      valueGetter: (value: string) => getDateFromIso8601(value),
    },
    {
      field: 'warnings',
      headerName: '',
      renderCell: ({ row }: { row: TrainingDto }) => {
        const dateMessages = warningsForDate(
          row.date,
          holidays,
          row.course!.weekdays,
        );
        if (dateMessages.length !== 0) {
          return (
            <Tooltip title={dateMessages.join(', ')}>
              <WarningAmberIcon
                sx={{ color: 'orange' }}
                style={{ verticalAlign: 'middle' }}
              />
            </Tooltip>
          );
        }
        return null;
      },
      flex: 0.1,
    },
    {
      field: 'userName',
      headerName: 'Übungsleitung',
      flex: 1.5,
      valueGetter: (_value, row: TrainingDto) => {
        return row.user?.name ?? '';
      },
    },
    {
      field: 'course',
      headerName: 'Kurs',
      flex: 2,
      valueGetter: (_value, row: TrainingDto) => {
        const hour = row.course?.startHour.toString().padStart(2, '0') ?? '';
        const minute =
          row.course?.startMinute.toString().padStart(2, '0') ?? '';
        return `${row.course?.name} ${hour}:${minute}, ${row.course?.durationMinutes}min`;
      },
    },
    {
      field: 'participantCount',
      headerName: 'Mitglieder',
      type: 'number',
      flex: 0.7,
    },
    {
      field: 'compensationCents',
      headerName: 'Pauschale',
      flex: 0.7,
      valueFormatter: (value: number) => centsToHumanReadable(value),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 0.7,
      valueGetter: (value: TrainingStatus) =>
        trainingStatusToHumanReadable(value),
    },
    {
      field: 'comment',
      headerName: 'Kommentar',
      flex: 2,
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

function queryKeyForTrainings(
  start: dayjs.Dayjs,
  end: dayjs.Dayjs,
  trainerId?: string,
) {
  return [
    API_TRAININGS,
    start.format('YYYY-MM-DD'),
    end.format('YYYY-MM-DD'),
    trainerId,
  ];
}

function trainingsQuery(
  accessToken: string,
  filterStart: dayjs.Dayjs,
  filterEnd: dayjs.Dayjs,
  trainerId?: string,
) {
  let queryComponents = ['expand=user'];
  const startString = filterStart.format('YYYY-MM-DD');
  queryComponents.push(`start=${startString}`);
  const endString = filterEnd.format('YYYY-MM-DD');
  queryComponents.push(`end=${endString}`);
  if (trainerId) {
    queryComponents.push(`trainerId=${trainerId}`);
  }
  const queryString = queryComponents.join('&');

  return useSuspenseQuery({
    queryKey: queryKeyForTrainings(filterStart, filterEnd, trainerId),
    queryFn: () =>
      fetchListFromApi<TrainingDto>(
        `${API_TRAININGS}?${queryString}`,
        accessToken!,
      ),
    staleTime: 10 * 60 * 1000,
  });
}

function compareTrainings(a: TrainingDto, b: TrainingDto) {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function approveMutation(
  accessToken: string,
  trainings: TrainingDto[],
  setTrainings: (v: TrainingDto[]) => void,
  refresh: () => void,
) {
  return useMutation({
    mutationFn: (id: number) => {
      return patchInApi<TrainingDto>(
        API_TRAININGS,
        id,
        { status: 'APPROVED' },
        accessToken,
      );
    },
    onSuccess: (updated) => {
      setTrainings(replaceElementWithId(trainings, updated));
      refresh();
    },
    onError: (e) => {
      showError(`Fehler bei der Freigabe des Trainings`, e.message);
    },
  });
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
};

/**
 * Renders a list of Trainings.
 *
 * The component keeps a separate state for the trainings so that we can immediately update the UI.
 * Every change to the trainings will trigger a refresh of the data from the server.
 * The refresh function has been throttled to keep the load low.
 */
export default function TrainingTable({
  holidays,
  session,
  ...props
}: TrainingTableProps) {
  const queryClient = useQueryClient();

  const [rowSelectionModel, setRowSelectionModel] =
    React.useState<GridRowSelectionModel>([]);
  const [activeTraining, setActiveTraining] =
    React.useState<TrainingDto | null>(null);

  const [trainings, setTrainings] = React.useState<TrainingDto[]>([]);

  const { data: trainingData } = props.trainerId
    ? trainingsQuery(
        session.accessToken,
        props.startDate,
        props.endDate,
        props.trainerId,
      )
    : { data: [] };

  React.useEffect(() => {
    setTrainings(trainingData.toSorted(compareTrainings));
  }, [trainingData]);

  const refresh = throttle(
    3000,
    () => {
      queryClient.invalidateQueries({
        queryKey: queryKeyForTrainings(
          props.startDate,
          props.endDate,
          props.trainerId ?? undefined,
        ),
      });
      queryClient.invalidateQueries({
        queryKey: [API_TRAININGS_SUMMARIZE, props.startDate, props.endDate],
      });
    },
    { noLeading: true },
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
  const deleteTrainingMutation = trainingDeleteQuery(
    session.accessToken,
    trainings,
    (trainings) => {
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

  const columns = buildGridColumns(
    holidays,
    (id: GridRowId) => () => approveTrainingMutation.mutate(id as number),
    (id: GridRowId) => () => revokeTrainingMutation.mutate(id as number),
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
