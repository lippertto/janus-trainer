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

import AddIcon from '@mui/icons-material/Add';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FastForwardIcon from '@mui/icons-material/FastForward';

import Button from '@mui/material/Button';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import Tooltip from '@mui/material/Tooltip';

import { JanusSession } from '@/lib/auth';
import TrainingDialog from '../../components/TrainingDialog';

import { showError } from '@/lib/notifications';
import { Holiday, TrainingStatus } from '@prisma/client';
import { CompensationValueDto, CourseDto, TrainingCreateRequest, TrainingDto } from '@/lib/dto';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
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
import { trainingCreateQuery, trainingDeleteQuery, trainingUpdateQuery } from '@/lib/shared-queries';
import { throttle } from 'throttle-debounce';

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
      flex: 1.5,
      valueFormatter: (value: string) => {
        return dateToHumanReadable(value);
      },
      valueGetter: (value: string) => getDateFromIso8601(value),
    },
    {
      field: 'warnings',
      headerName: '',
      renderCell: ({ row }: {row: TrainingDto}) => {
        const dateMessages = warningsForDate(row.date, holidays, row.course.weekdays);
        if (dateMessages.length !== 0) {
          return (
            <Tooltip title={dateMessages.join(", ")}>
              <WarningAmberIcon sx={{ color: 'orange' }} />
            </Tooltip>
          );
        }
        return null;
      },
      flex: 0.5,
    },
    {
      field: 'userName',
      headerName: 'Übungsleitung',
      flex: 2,
      valueGetter: (_value, row: TrainingDto) => {
        return row.user.name;
      },
    },
    {
      field: 'course',
      headerName: 'Kurs',
      flex: 2,
      valueGetter: (_value, row: TrainingDto) => {
        return row.course.name;
      },
    },
    {
      field: 'participantCount',
      headerName: 'Mitglieder',
      type: 'number',
      flex: 1,
    },
    {
      field: 'compensationCents',
      headerName: 'Pauschale',
      flex: 1,
      valueFormatter: (value: number) => (centsToHumanReadable(value)),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      valueGetter: (value: TrainingStatus) => (trainingStatusToHumanReadable(value)),
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

function TrainingTableToolbar(
  {
    handleDelete,
  }: TrainingTableToolbarProps) {
  return (
    <GridToolbarContainer>
      <Button
        startIcon={<DeleteIcon />}
        disabled={!Boolean(handleDelete)}
        onClick={handleDelete}>
        löschen
      </Button>
    </GridToolbarContainer>
  );
}

function queryKeyForTrainings(start: dayjs.Dayjs, end: dayjs.Dayjs, trainerId?: string) {
  return [API_TRAININGS, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'), trainerId];
}

function trainingsQuery(
  accessToken: string,
  filterStart: dayjs.Dayjs,
  filterEnd: dayjs.Dayjs,
  trainerId?: string,
) {
  const startString = filterStart.format('YYYY-MM-DD');
  const endString = filterEnd.format('YYYY-MM-DD');
  const trainerFilter = trainerId ? `&trainerId=${trainerId}` : '';
  return useSuspenseQuery({
    queryKey: queryKeyForTrainings(filterStart, filterEnd, trainerId),
    queryFn: () => fetchListFromApi<TrainingDto>(
      `${API_TRAININGS}?start=${startString}&end=${endString}${trainerFilter}`,
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


type TrainingTableProps = {
  /** List of holidays used to highlight collisions */
  holidays: Holiday[];
  session: JanusSession;
  trainerId: string|null;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
};

/**
 * Renders a list of Trainings.
 */
export default function TrainingTable(
  {
    holidays,
    session,
    ...props
  }: TrainingTableProps) {
  const queryClient = useQueryClient();

  const [rowSelectionModel, setRowSelectionModel] = React.useState<GridRowSelectionModel>(
    [],
  );
  const [activeTraining, setActiveTraining] =
    React.useState<TrainingDto | null>(null);

  const [trainings, setTrainings] = React.useState<TrainingDto[]>([]);

  const { data: trainingData } = props.trainerId ?
    trainingsQuery(session.accessToken,
    props.startDate, props.endDate, props.trainerId
  ) : {data: []};


  React.useEffect(() => {
    setTrainings(trainingData.toSorted(compareTrainings));
  }, [trainingData]);


  const refresh = throttle(
    3000,
    () => {
      queryClient.invalidateQueries({
        queryKey: queryKeyForTrainings(
          props.startDate, props.endDate, props.trainerId ?? undefined,
        ),
      });
      queryClient.invalidateQueries({ queryKey: [API_TRAININGS_SUMMARIZE, props.startDate, props.endDate] });
    },
    { noLeading: true },
  );

  const approveTrainingMutation = useMutation({
    mutationFn: (id: number) => {
      return patchInApi<TrainingDto>(
        API_TRAININGS,
        id,
        { status: 'APPROVED' },
        session.accessToken,
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

  const revokeTrainingMutation = useMutation({
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

  const deleteTrainingMutation = trainingDeleteQuery(session.accessToken, trainings, setTrainings);

  const confirm = useConfirm();
  const handleDeleteClick = (training: TrainingDto) => {
    confirm({
      title: 'Training löschen?',
      description: `Soll das Training "${training.course.name}" vom ${dateToHumanReadable(training.date)} gelöscht werden?`,
    })
      .then(
        () => {
          deleteTrainingMutation.mutate(training);
          refresh();
        },
      ).catch(() => {
    });
  };

  const columns = buildGridColumns(holidays,
    (id: GridRowId) => (
      () => approveTrainingMutation.mutate(id as number)
    ),
    (id: GridRowId) => (
      () => revokeTrainingMutation.mutate(id as number)
    ),
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
        onRowSelectionModelChange={
          (newValue) => {
            if (newValue.length === 0) {
              setActiveTraining(null);
            } else {
              setActiveTraining(
                trainings.find((t) => (t?.id === newValue[0] as number)) ??
                null,
              )
              ;
            }
            setRowSelectionModel(newValue);
          }
        }
        slots={{
          toolbar: TrainingTableToolbar,
        }}
        slotProps={{
          toolbar: {
            handleDelete: activeTraining && activeTraining.status === TrainingStatus.NEW ? () => (handleDeleteClick(activeTraining)) : undefined,
          },
        }}
        {...props}
      />
    </>
  );
}
