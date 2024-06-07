import React from 'react';

import dayjs from 'dayjs';

import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridEditInputCell,
  GridRenderEditCellParams,
  GridRowId,
  GridRowParams,
  GridRowSelectionModel,
  GridToolbarContainer,
  GridValueGetterParams,
  useGridApiContext,
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

import { useSession } from 'next-auth/react';

import { JanusSession } from '@/lib/auth';
import TrainingDialog from './TrainingDialog';

import { centsToDisplayString, getDateFromIso8601, gridValueToHumanReadableDate } from '@/lib/datagrid-utils';
import { showError, showSuccess } from '@/lib/notifications';
import { styled } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers';
import { approveTraining, unapproveTraining } from '@/lib/api-trainings';
import { Discipline, Holiday, TrainingStatus } from '@prisma/client';
import { CompensationValueDto, CourseDto, TrainingCreateRequest, TrainingDto, TrainingUpdateRequest } from '@/lib/dto';
import { useMutation } from '@tanstack/react-query';
import { createInApi, deleteFromApi, updateInApi } from '@/lib/fetch';
import { API_TRAININGS } from '@/lib/routes';
import { useConfirm } from 'material-ui-confirm';
import { dateToHumanReadable } from '@/lib/formatters';

require('dayjs/locale/de');
dayjs.locale('de');

function warningForDate(d: string, holidays: Holiday[]): string | null {
  if (new Date(d).getDay() === 0) {
    return 'Ist ein Sonntag';
  }
  for (const h of holidays) {
    if (d >= h.start && d <= h.end) {
      return `Kollidiert mit dem Feiertag ${h.name}`;
    }
  }
  return null;
}

function dateIsValid(date: Date | string) {
  return !dayjs(date).isAfter(dayjs());
}

function participantCountIsValid(n: number): boolean {
  return !!n && n >= 0;
}

function trainingIsValid(t: TrainingDto): boolean {
  if (!dateIsValid(t.date)) return false;
  if (!participantCountIsValid(Number(t.participantCount))) {
    return false;
  }
  return true;
}

const StyledTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.palette.error.main,
    color: theme.palette.error.contrastText,
  },
}));

/** We have to use the MUI X DatePicker. The regular date component gets confused with our setValue/getValue logic. */
function JanusGridEditDateCell(params: {
  id: GridRowId;
  field: string;
  value?: dayjs.Dayjs;
  error?: string;
}) {
  const apiRef = useGridApiContext();
  const { error, id, field, value } = params;
  const propsForDateCell = { ...params, error: !!error };

  const handleChange = (newValue: dayjs.Dayjs | null) => {
    apiRef.current.setEditCellValue({ id, field, value: newValue });
  };

  // the div is required for the Tooltip. The GridEditDateCell cannot be wrapped directly.
  return (
    <div>
      <DatePicker
        {...propsForDateCell}
        value={value}
        onChange={handleChange}
        maxDate={dayjs()}
      />
    </div>
  );
}

function renderNonEmptyStringCell(params: GridRenderEditCellParams) {
  const { error, ...otherParams } = params;
  return (
    <StyledTooltip open={!!error} title={error}>
      <GridEditInputCell {...otherParams} />
    </StyledTooltip>
  );
}

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
      valueFormatter: gridValueToHumanReadableDate,
      valueGetter: (params) => getDateFromIso8601(params.value),
    },
    {
      field: 'warnings',
      headerName: '',
      renderCell: (params) => {
        const dateMessage = warningForDate(params.row.date, holidays);
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
  handleRefresh: () => void;
  handleAddTraining?: () => void;
  handleDelete: () => void;
  handleEdit: () => void;
};

function TrainingTableToolbar(
  {
    handleRefresh,
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
      <Button startIcon={<RefreshIcon />} onClick={handleRefresh}>
        neu laden
      </Button>
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

interface Row extends TrainingDto {
  isNew?: boolean;
}

type SetTrainings = React.Dispatch<React.SetStateAction<TrainingDto[]>>;

type TrainingTableProps = {
  /** The trainings to display. Note: Should be sorted, e.g. with `v.sort((r1, r2) => parseInt(r1.id) - parseInt(r2.id))` */
  trainings: TrainingDto[];
  setTrainings: SetTrainings;
  refresh: () => void;
  /** Whether the UI should show the approval actions. (User must be admin to actually execute the steps.) */
  approvalMode: boolean;
  /** List of holidays used to highligh collisions */
  holidays: Holiday[];
  courses: CourseDto[];
};

// we cannot use Set here, because Firefox does not support it
function addUnknownValuesToCompensationValues(compensationValues: CompensationValueDto[], trainings: TrainingDto[]): CompensationValueDto[] {
  const trainingCompensations = trainings.map((t) => Number(t.compensationCents));
  const uniqueTrainingCompensations = trainingCompensations.filter((value, index, array) => {
    return array.indexOf(value) === index;
  });
  const missingCompensations = uniqueTrainingCompensations.filter(
    (trainingCompensation) => (compensationValues.find((cv) => (cv.cents === trainingCompensation)) === undefined),
  );
  return [...compensationValues, ...missingCompensations.map((cents: number) => ({
    cents,
    description: 'unbekannt',
    id: Math.floor(Math.random() * 100000),
  }))];
}

/**
 * Renders a list of Trainings.
 */
export default function TrainingTable(
  {
    trainings,
    setTrainings,
    refresh,
    approvalMode,
    holidays,
    courses,
    ...props
  }: TrainingTableProps) {
  const [rowSelectionModel, setRowSelectionModel] = React.useState<GridRowSelectionModel>(
    [],
  );
  const [showTrainingDialog, setShowTrainingDialog] = React.useState<boolean>(false);
  const [activeTraining, setActiveTraining] =
    React.useState<TrainingDto | null>(null);


  const { data } = useSession();
  const session = data as JanusSession;

  const handleApproveClick = (id: GridRowId) => () => {
    // TODO - do not use refresh
    approveTraining(session?.accessToken, id as string).then(refresh);
  };

  const handleRevokeClick = (id: GridRowId) => () => {
    // TODO - do not use refresh
    unapproveTraining(session?.accessToken, id as string).then(refresh);
  };

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

  const columns = buildGridColumns(holidays, handleApproveClick, handleRevokeClick);

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
            handleRefresh: refresh,
            handleAddTraining: approvalMode
              ? undefined
              : () => {
                setActiveTraining(null);
                setShowTrainingDialog(true);
              },
            handleDelete: activeTraining ? () => (handleDeleteClick(activeTraining)) : null,
            handleEdit: activeTraining ? () => {
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
