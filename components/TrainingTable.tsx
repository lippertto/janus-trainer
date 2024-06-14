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
  GridValueFormatterParams,
  GridValueGetterParams,
} from '@mui/x-data-grid';

import AddIcon from '@mui/icons-material/Add';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FastForwardIcon from '@mui/icons-material/FastForward';

import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import Tooltip, { tooltipClasses, TooltipProps } from '@mui/material/Tooltip';

import { JanusSession } from '@/lib/auth';
import TrainingDialog from './TrainingDialog';

import { showError, showSuccess } from '@/lib/notifications';
import { styled } from '@mui/material/styles';
import { unapproveTraining } from '@/lib/api-trainings';
import { DayOfWeek, Holiday, TrainingStatus } from '@prisma/client';
import { CourseDto, TrainingCreateRequest, TrainingDto, TrainingUpdateRequest } from '@/lib/dto';
import { useMutation } from '@tanstack/react-query';
import { createInApi, deleteFromApi, patchInApi, updateInApi } from '@/lib/fetch';
import { API_TRAININGS } from '@/lib/routes';
import { useConfirm } from 'material-ui-confirm';
import { centsToDisplayString, dateToHumanReadable, getDateFromIso8601 } from '@/lib/formatters';
import { replaceElementWithId } from '@/lib/sort-and-filter';

require('dayjs/locale/de');
dayjs.locale('de');

function dayOfWeekToInt(d: DayOfWeek): number {
  switch (d) {
    case 'MONDAY':
      return 1;
    case 'TUESDAY':
      return 2;
    case 'WEDNESDAY':
      return 3;
    case 'THURSDAY':
      return 4;
    case 'FRIDAY':
      return 5;
    case 'SATURDAY':
      return 6;
    case 'SUNDAY':
      return 0;
  }
}

const GERMAN_DAYS: string[] = new Array(7);
GERMAN_DAYS[0] = 'So';
GERMAN_DAYS[1] = 'Mo'
GERMAN_DAYS[2] = 'Di'
GERMAN_DAYS[3] = 'Mi'
GERMAN_DAYS[4] = 'Do'
GERMAN_DAYS[5] = 'Fr'
GERMAN_DAYS[6] = 'Sa'

function warningForDate(dateString: string, holidays: Holiday[], weekdays: DayOfWeek[]): string | null {
  let dayNumber = new Date(dateString).getDay();
  if (dayNumber === 0) {
    return 'Ist ein Sonntag';
  }
  for (const h of holidays) {
    if (dateString >= h.start && dateString <= h.end) {
      return `Kollidiert mit dem Feiertag ${h.name}`;
    }
  }
  let isOnValidWeekday = false;
  for (const wd of weekdays) {
    if (dayNumber === dayOfWeekToInt(wd)) {
      isOnValidWeekday = true;
    }
  }
  if (!isOnValidWeekday) {
    const allowedDays = weekdays.map(
      (wd) => (GERMAN_DAYS.at(dayOfWeekToInt(wd)))
    ).join(", ");
    return `Kurs findet nur an diesen Tagen statt: ${allowedDays}`
  }

  return null;
}

const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  },
}));

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
      valueFormatter: function(params: GridValueFormatterParams): string {
        return dateToHumanReadable(params.value);
      },
      valueGetter: (params) => getDateFromIso8601(params.value),
    },
    {
      field: 'warnings',
      headerName: '',
      renderCell: ({ row }: {row: TrainingDto}) => {
        const dateMessage = warningForDate(row.date, holidays, row.course.weekdays);
        if (dateMessage) {
          return (
            <Tooltip title={dateMessage}>
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
      valueGetter: (params: GridValueGetterParams<TrainingDto>) => {
        return params.row.user.name;
      },
    },
    {
      field: 'course',
      headerName: 'Kurs',
      flex: 2,
      valueGetter: (params: GridValueGetterParams<TrainingDto>) => {
        return params.row.course.name;
      },
    },
    {
      field: 'participantCount',
      headerName: 'Teilnehmer',
      type: 'number',
      flex: 1,
    },
    {
      field: 'compensationCents',
      headerName: 'Vergütung',
      flex: 1,
      valueFormatter: (value) => (centsToDisplayString(value.value)),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      valueGetter: (params) => {
        if (params.value === TrainingStatus.NEW) {
          return 'neu';
        } else if (params.value === TrainingStatus.APPROVED) {
          return 'freigegeben';
        } else if (params.value === TrainingStatus.COMPENSATED) {
          return 'überwiesen';
        } else {
          console.log(`Found bad status '${params.value}'`);
          return '?';
        }
      },
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
  handleDelete: () => void;
  handleEdit: () => void;
};

function TrainingTableToolbar(
  {
    handleAddTraining,
    handleDelete,
    handleEdit,
  }: TrainingTableToolbarProps) {
  return (
    <GridToolbarContainer>
      {handleAddTraining ? (
        <Button
          data-testid="add-training-button"
          startIcon={<AddIcon />}
          onClick={() => {
            handleAddTraining();
          }}
        >
          Training hinzufügen
        </Button>
      ) : (
        <></>
      )}
      <Button
        startIcon={<DeleteIcon />}
        disabled={!Boolean(handleDelete)}
        onClick={handleDelete}>
        löschen
      </Button>
      <Button
        startIcon={<EditIcon />}
        disabled={!Boolean(handleEdit)}
        onClick={handleEdit}>
        bearbeiten
      </Button>
    </GridToolbarContainer>
  );
}

type SetTrainings = React.Dispatch<React.SetStateAction<TrainingDto[]>>;

type TrainingTableProps = {
  /** The trainings to display. Note: Should be sorted, e.g. with `v.sort((r1, r2) => parseInt(r1.id) - parseInt(r2.id))` */
  trainings: TrainingDto[];
  setTrainings: SetTrainings;
  /** Whether the UI should show the approval actions. (User must be admin to actually execute the steps.) */
  approvalMode: boolean;
  /** List of holidays used to highlight collisions */
  holidays: Holiday[];
  courses: CourseDto[];
  session: JanusSession;
};

/**
 * Renders a list of Trainings.
 */
export default function TrainingTable(
  {
    trainings,
    setTrainings,
    approvalMode,
    holidays,
    courses,
    session,
    ...props
  }: TrainingTableProps) {
  const [rowSelectionModel, setRowSelectionModel] = React.useState<GridRowSelectionModel>(
    [],
  );
  const [showTrainingDialog, setShowTrainingDialog] = React.useState<boolean>(false);
  const [activeTraining, setActiveTraining] =
    React.useState<TrainingDto | null>(null);

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
    },
    onError: (e) => {
      showError(`Fehler beim Widerruf der Freigabe`, e.message);
    },
  });

  const createTrainingMutation = useMutation({
    mutationFn: (data: TrainingCreateRequest) => {
      return createInApi<TrainingDto>(API_TRAININGS, data, session?.accessToken ?? '');
    },
    onSuccess: (createdTraining: TrainingDto) => {
      setTrainings([...trainings, createdTraining]);
      showSuccess(`Training für ${createdTraining.course.name} erstellt`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen des Trainings`, e.message);
    },
  });

  const deleteTrainingMutation = useMutation({
    mutationFn: (t: TrainingDto) => {
      return deleteFromApi<TrainingDto>(API_TRAININGS, t, session?.accessToken ?? '');
    },
    onSuccess: (deleted: TrainingDto) => {
      setTrainings(trainings.filter((t) => (t.id !== deleted.id)));
      showSuccess(`Training für ${deleted.course.name} gelöscht`);
    },
    onError: (e) => {
      showError(`Fehler beim Löschen des Trainings`, e.message);
    },
  });

  const updateTrainingMutation = useMutation({
      mutationFn: (props: { data: TrainingUpdateRequest, trainingId: number }) => {
        return updateInApi<TrainingDto>(API_TRAININGS, props.trainingId, props.data, session?.accessToken ?? '');
      },
      onSuccess: (data: TrainingDto) => {
        const newTrainings = trainings.map((d) => {
          if (d.id === data.id) {
            return data;
          } else {
            return d;
          }
        });
        setTrainings(newTrainings);
        showSuccess(`Training ${data.course.name} vom ${dateToHumanReadable(data.date)} aktualisiert`);
      },
      onError: (e) => {
        showError(`Fehler beim Aktualisieren des Trainings`, e.message);
      },
    },
  );

  const confirm = useConfirm();
  const handleDeleteClick = (training: TrainingDto) => {
    confirm({
      title: 'Training löschen?',
      description: `Soll das Training "${training.course.name}" vom ${dateToHumanReadable(training.date)} gelöscht werden?`,
    })
      .then(
        () => {
          deleteTrainingMutation.mutate(training);
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
          columns: {
            columnVisibilityModel: {
              userName: approvalMode,
              approvalActions: approvalMode,
            },
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
            handleAddTraining: approvalMode
              ? undefined
              : () => {
                setActiveTraining(null);
                setShowTrainingDialog(true);
              },
            handleDelete: activeTraining && activeTraining.status === TrainingStatus.NEW ? () => (handleDeleteClick(activeTraining)) : null,
            handleEdit: activeTraining && activeTraining.status === TrainingStatus.NEW ? () => {
              setShowTrainingDialog(true);
            } : null,
          },
        }}
        {...props}
      />
      <TrainingDialog
        open={showTrainingDialog}
        userId={session?.userId}
        handleClose={() => {
          setRowSelectionModel([]);
          setActiveTraining(null);
          setShowTrainingDialog(false);
        }}
        handleConfirm={(data: TrainingCreateRequest) => {
          if (activeTraining) {
            updateTrainingMutation.mutate({ trainingId: activeTraining.id, data });
          } else {
            createTrainingMutation.mutate(data);
          }
        }}
        trainingToEdit={activeTraining}
        courses={courses}
      />
    </>
  );
}
