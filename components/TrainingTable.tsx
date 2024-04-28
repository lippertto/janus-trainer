import React from 'react';

import dayjs from 'dayjs';

import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridEditInputCell,
  GridPreProcessEditCellProps,
  GridRenderEditCellParams,
  GridRowId,
  GridRowModes,
  GridRowModesModel,
  GridRowParams,
  GridToolbarContainer,
  GridValueGetterParams,
  GridValueSetterParams,
  useGridApiContext,
} from '@mui/x-data-grid';

import AddIcon from '@mui/icons-material/Add';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FastForwardIcon from '@mui/icons-material/FastForward';

import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';

import { useSession } from 'next-auth/react';

import { JanusSession } from '../lib/auth';
import DeleteTrainingDialog from './DeleteTrainingDialog';
import AddTrainingDialog from './AddTrainingDialog';

import {
  dateToIso8601,
  getDateFromIso8601,
  toHumanReadableDate,
} from '@/lib/datagrid-utils';
import { showError, showSuccess } from '@/lib/notifications';
import { styled } from '@mui/material/styles';
import { DatePicker } from '@mui/x-date-pickers';
import {
  addTraining,
  approveTraining,
  deleteTraining,
  unapproveTraining,
  updateTraining,
} from '@/lib/api-trainings';
import { Discipline, Holiday, TrainingStatus } from '@prisma/client';
import { TrainingDtoNew } from '@/lib/dto';

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

function trainingIsValid(t: TrainingDtoNew): boolean {
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

function preProcessEditCellPropsForNonEmptyString(
  params: GridPreProcessEditCellProps,
) {
  if (!params.props.value) {
    return { ...params.props, error: 'Darf nicht leer sein' };
  }
  return { ...params.props, error: undefined };
}

function buildGridColumns(
  disciplines: Discipline[],
  rowModesModel: GridRowModesModel,
  holidays: Holiday[],
  handleCancelClick: { (id: GridRowId): () => void },
  handleDeleteClick: { (id: GridRowId): () => void },
  handleEditClick: { (id: GridRowId): () => void },
  handleSaveClick: { (id: GridRowId): () => void },
  handleApproveClick: { (id: GridRowId): () => void },
  handleRevokeClick: { (id: GridRowId): () => void },
): GridColDef[] {
  return [
    {
      field: 'date',
      headerName: 'Datum',
      type: 'date',
      flex: 1.5,
      valueFormatter: toHumanReadableDate,
      valueGetter: (params) => getDateFromIso8601(params.value),
      valueSetter: dateToIso8601,
      editable: true,
      preProcessEditCellProps: (params: GridPreProcessEditCellProps) => {
        if (!dateIsValid(params.props.value)) {
          return {
            ...params.props,
            error: 'Datum darf nicht in der Zukunft liegen',
          };
        }
        return {
          ...params.props,
          error: undefined,
        };
      },
      renderEditCell: (params: GridRenderEditCellParams) => {
        return <JanusGridEditDateCell {...params} />;
      },
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
      editable: true,
      flex: 2,
      valueGetter: (params: GridValueGetterParams<TrainingDtoNew>) => {
        return params.row.user.name;
      },
    },
    {
      field: 'discipline',
      headerName: 'Sportart',
      type: 'singleSelect',
      editable: true,
      valueOptions: disciplines.map((v) => v.name),
      valueGetter: (params: GridValueGetterParams<TrainingDtoNew>) => {
        return params.row.discipline.name;
      },
      valueSetter: (params: GridValueSetterParams) => {
        const discipine = disciplines.find((d) => d.name == params.value);
        return { ...params.row, discipline: discipine };
      },
      flex: 2,
    },
    {
      field: 'group',
      headerName: 'Gruppe',
      editable: true,
      flex: 2,
      preProcessEditCellProps: preProcessEditCellPropsForNonEmptyString,
      renderEditCell: renderNonEmptyStringCell,
    },
    {
      field: 'participantCount',
      headerName: 'Teilnehmer',
      type: 'number',
      flex: 1,
      editable: true,
      preProcessEditCellProps: (params: GridPreProcessEditCellProps) => {
        // unclear why this happens. This case happens sometimes when the date becomes invalid
        if (!params.props.value === undefined) {
          return { ...params.props, error: undefined };
        }
        if (!params.props.value || params.props.value <= 0) {
          return { ...params.props, error: 'Ungültiger Wert' };
        }
        return { ...params.props, error: undefined };
      },
      renderEditCell: (params: GridRenderEditCellParams) => {
        const { error } = params;
        const paramsForCell = { ...params, error: !!error };
        return (
          <StyledTooltip open={!!error} title={error}>
            <GridEditInputCell {...paramsForCell} />
          </StyledTooltip>
        );
      },
    },
    {
      field: 'compensationCents',
      headerName: 'Vergütung',
      type: 'singleSelect',
      flex: 1,
      editable: true,
      valueOptions: ['27€', '24€', '21€', '19€', '16€'],
      valueGetter: (params: GridValueGetterParams) => {
        const euroValue = params.value / BigInt(100);
        return `${euroValue}€`;
      },
      valueSetter: (params: GridValueSetterParams) => {
        const numberPart = params.value.substring(0, params.value.length - 1);
        const euros = parseInt(numberPart);
        const cents = euros * 100;
        return { ...params.row, compensationCents: cents };
      },
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
      field: 'actions',
      type: 'actions',
      headerName: '',
      flex: 1,
      cellClassName: 'actions',
      getActions: ({ id, row }: GridRowParams<TrainingDtoNew>) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
        if (isInEditMode) {
          return [
            <GridActionsCellItem
              icon={<SaveIcon />}
              label="Save"
              sx={{
                color: 'primary.main',
              }}
              onClick={handleSaveClick(id)}
              key="save-button"
            />,
            <GridActionsCellItem
              icon={<CancelIcon />}
              label="Cancel"
              className="textPrimary"
              onClick={handleCancelClick(id)}
              color="inherit"
              key="cancel-button"
            />,
          ];
        }

        if (row.status === TrainingStatus.NEW) {
          return [
            <GridActionsCellItem
              icon={<EditIcon />}
              label="Edit"
              className="textPrimary"
              onClick={handleEditClick(id)}
              color="inherit"
              key="edit-button"
            />,
            <GridActionsCellItem
              icon={<DeleteIcon />}
              label="Delete"
              onClick={handleDeleteClick(id)}
              color="inherit"
              key="delete-button"
            />,
          ];
        } else {
          return [];
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
};

function TrainingTableToolbar({
  handleRefresh,
  handleAddTraining,
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
    </GridToolbarContainer>
  );
}

interface Row extends TrainingDtoNew {
  isNew?: boolean;
}

type SetTrainings = React.Dispatch<React.SetStateAction<TrainingDtoNew[]>>;

type TrainingTableProps = {
  /** The trainings to display. Note: Should be sorted, e.g. with `v.sort((r1, r2) => parseInt(r1.id) - parseInt(r2.id))` */
  trainings: TrainingDtoNew[];
  setTrainings: SetTrainings;
  refresh: () => Promise<TrainingDtoNew[]>;
  /** Whether the UI should show the approval actions. (User must be admin to actually execute the steps.) */
  approvalMode: boolean;
  /** A list of disciplines for the dropdown. */
  disciplines: Discipline[];
  /** List of holidays used to highligh collisions */
  holidays: Holiday[];
};

/**
 * Renders a list of Trainings.
 */
export default function TrainingTable({
  trainings,
  setTrainings,
  refresh,
  approvalMode,
  disciplines = [],
  holidays = [],
  ...props
}: TrainingTableProps) {
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>(
    {},
  );
  const [showAddDialog, setShowAddDialog] = React.useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] =
    React.useState<boolean>(false);
  const [trainingToDelete, setTrainingToDelete] =
    React.useState<TrainingDtoNew | null>(null);

  const trainingTemplate = trainings
    ? trainings[trainings.length - 1]
    : undefined;

  const { data } = useSession();
  const session = data as JanusSession;

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });
  };

  const handleEditClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleDeleteClick = (id: GridRowId) => () => {
    const trainingToDelete = trainings.find((row) => row.id === id);
    if (!trainingToDelete) {
      console.error(`Could not find training ${id} to delete`);
      return;
    }
    setTrainingToDelete(trainingToDelete);
    setShowDeleteDialog(true);
  };

  const handleSaveClick = (id: GridRowId) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.View } });
  };

  const handleApproveClick = (id: GridRowId) => () => {
    // TODO - do not use refresh
    approveTraining(session?.accessToken, id as string).then(refresh);
  };

  const handleRevokeClick = (id: GridRowId) => () => {
    // TODO - do not use refresh
    unapproveTraining(session?.accessToken, id as string).then(refresh);
  };

  const handleDeleteConfirmation = React.useCallback(
    async (ok: boolean) => {
      if (ok && trainingToDelete) {
        await deleteTraining(session?.accessToken, trainingToDelete.id)
          .then(() =>
            setTrainings(trainings.filter((t) => t.id !== trainingToDelete.id)),
          )
          .catch((e) => {
            showError(`Konnte Training nicht löschen: ${e.message}`);
          });
      }
      setShowDeleteDialog(false);
    },
    [session?.accessToken, setTrainings, trainings, trainingToDelete],
  );

  const handleDialogSaveClick = React.useCallback(
    (
      disciplineId: number,
      group: string,
      participantCount: number,
      compensation: number,
      date: string,
      userId: string,
    ) => {
      if (!session?.accessToken) return;
      addTraining(
        session?.accessToken,
        date,
        disciplineId,
        group,
        compensation,
        participantCount,
        userId,
      )
        .then((savedTraining) => {
          showSuccess('Training gespeichert');
          setTrainings([...trainings, savedTraining]);
        })
        .catch((e) => {
          showError('Konnte Training nicht speichern', e.message);
        });
    },
    [session?.accessToken, trainings, setTrainings],
  );

  /** This function is called when an edited row is saved. It will synchronize the changes to the database. */
  const processRowUpdate = React.useCallback(
    async (updatedRow: Row, originalRow: Row): Promise<Row> => {
      // TODO find out why this happens
      if (!updatedRow?.id) return originalRow;

      if (!trainingIsValid(updatedRow)) {
        return originalRow;
      }
      return updateTraining(
        session?.accessToken,
        updatedRow.id,
        updatedRow.date,
        updatedRow.discipline.id,
        updatedRow.group,
        // Check how to do this correctly
        Number(updatedRow.compensationCents),
        Number(updatedRow.participantCount),
      );
    },
    [session?.accessToken],
  );

  const columns = buildGridColumns(
    disciplines,
    rowModesModel,
    holidays,
    handleCancelClick,
    handleDeleteClick,
    handleEditClick,
    handleSaveClick,
    handleApproveClick,
    handleRevokeClick,
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
        editMode="row"
        disableRowSelectionOnClick={true}
        isCellEditable={(params) =>
          params.field != 'userName' || params.row.isNew
        }
        columns={columns}
        processRowUpdate={processRowUpdate}
        // rows should sorted before we pass them on. Else, the rows might jump when their status is changed.
        rows={trainings}
        rowModesModel={rowModesModel}
        slots={{
          toolbar: TrainingTableToolbar,
        }}
        slotProps={{
          toolbar: {
            handleRefresh: refresh,
            handleAddTraining: approvalMode
              ? undefined
              : () => {
                  setShowAddDialog(true);
                },
          },
        }}
        {...props}
      />
      <DeleteTrainingDialog
        open={showDeleteDialog}
        training={trainingToDelete}
        onUserChoice={handleDeleteConfirmation}
      />
      <AddTrainingDialog
        open={showAddDialog}
        disciplines={disciplines}
        userId={session.userId}
        template={trainingTemplate}
        handleClose={() => {
          setShowAddDialog(false);
        }}
        handleSave={handleDialogSaveClick}
      />
    </>
  );
}
