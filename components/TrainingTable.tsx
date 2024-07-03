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
import TrainingDialog from './TrainingDialog';

import { showError } from '@/lib/notifications';
import { Holiday, TrainingStatus } from '@prisma/client';
import { CompensationValueDto, CourseDto, TrainingCreateRequest, TrainingDto } from '@/lib/dto';
import { useMutation } from '@tanstack/react-query';
import { patchInApi } from '@/lib/fetch';
import { API_TRAININGS } from '@/lib/routes';
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
      {handleAddTraining?
      <Button
        startIcon={<EditIcon />}
        disabled={!Boolean(handleEdit)}
        onClick={handleEdit}>
        bearbeiten
      </Button>
        : null
      }
    </GridToolbarContainer>
  );
}

type TrainingTableProps = {
  /** The trainings to display. Note: Should be sorted, e.g. with `v.sort((r1, r2) => parseInt(r1.id) - parseInt(r2.id))` */
  trainings: TrainingDto[];
  setTrainings: (trainings: TrainingDto[]) => void;
  /** Whether the UI should show the approval actions. (User must be admin to actually execute the steps.) */
  approvalMode: boolean;
  /** List of holidays used to highlight collisions */
  holidays: Holiday[];
  courses: CourseDto[];
  session: JanusSession;
  compensationValues: CompensationValueDto[];
};

/**
 * Renders a list of Trainings.
 */
export default function TrainingTable(
  {
    trainings,
    setTrainings,
    compensationValues,
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

  const createTrainingMutation = trainingCreateQuery(session.accessToken, trainings, setTrainings);
  const deleteTrainingMutation = trainingDeleteQuery(session.accessToken, trainings, setTrainings);
  const updateTrainingMutation = trainingUpdateQuery(session.accessToken, trainings, setTrainings);

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
            handleDelete: activeTraining && activeTraining.status === TrainingStatus.NEW ? () => (handleDeleteClick(activeTraining)) : undefined,
            handleEdit: approvalMode ? undefined:  activeTraining && activeTraining.status === TrainingStatus.NEW ? () => {
              setShowTrainingDialog(true);
            } : undefined,
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
        handleSave={(data: TrainingCreateRequest) => {
          if (activeTraining) {
            updateTrainingMutation.mutate({ trainingId: activeTraining.id, data });
          } else {
            createTrainingMutation.mutate(data);
          }
        }}
        toEdit={activeTraining}
        courses={courses}
        compensationValues={compensationValues}
      />
    </>
  );
}
