import React from 'react';
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridEditDateCell,
  GridEditInputCell,
  GridPreProcessEditCellProps,
  GridRenderEditCellParams,
  GridRowId,
  GridRowModes,
  GridRowModesModel,
  GridToolbarContainer,
  GridValueGetterParams,
  GridValueSetterParams,
} from '@mui/x-data-grid';
import { Backend, Training, TrainingStatus } from '../lib/backend';

import AddIcon from '@mui/icons-material/Add';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FastForwardIcon from '@mui/icons-material/FastForward';

import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import { v4 as uuidv4 } from 'uuid';
import { useSession } from 'next-auth/react';

import dayjs from 'dayjs';
import { JanusSession } from '../lib/auth';
import DeleteTrainingDialog from './DeleteTrainingDialog';
import { DisciplineDto } from 'janus-trainer-dto';

import {
  dateToIso8601,
  getDateFromIso8601,
  toHumanReadableDate,
} from '@/lib/datagrid-utils';
import Tooltip, { TooltipProps, tooltipClasses } from '@mui/material/Tooltip';
import { styled } from '@mui/material/styles';

require('dayjs/locale/de');
dayjs.locale('de');

/**
 *  Obtain the newest training (to create a new entry to the table).
 * Since the ISO 8601 dates can be sorted alphabetically, we only do a string comparison here.
 */
function getNewestTraining(trainings: Training[]): Training {
  return trainings
    .toSorted((a, b) => {
      if (a.date < b.date) return -1;
      if (b.date > a.date) return 1;
      return 0;
    })
    .slice(-1)[0];
}

function dateIsValid(date: Date | string) {
  return !dayjs(date).isAfter(dayjs());
}

function participantCountIsValid(n: number) {
  return n && n >= 0;
}

function trainingIsValid(t: Training): boolean {
  if (!dateIsValid(t.date)) return false;
  if (!participantCountIsValid(t.participantCount)) return false;
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

export function renderDateCell(params: GridRenderEditCellParams) {
  const { error } = params;
  // the div is required for the Tooltip. The GridEditDateCell cannot be wrapped directly.
  const propsForDateCell = { ...params, error: !!error };
  return (
    <StyledTooltip open={!!error} title={error}>
      <div>
        <GridEditDateCell
          {...propsForDateCell}
          inputProps={{ max: new Date() }}
        />
      </div>
    </StyledTooltip>
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

function getGridColumns(
  trainings: Training[],
  disciplines: DisciplineDto[],
  rowModesModel: GridRowModesModel,
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
      width: 150,
      valueFormatter: toHumanReadableDate,
      valueGetter: getDateFromIso8601,
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
      renderEditCell: renderDateCell,
    },
    {
      field: 'userName',
      headerName: 'Übungsleitung',
      editable: true,
      width: 200,
    },
    {
      field: 'discipline',
      headerName: 'Sportart',
      type: 'singleSelect',
      editable: true,
      valueOptions: disciplines.map((v) => v.name),
      valueGetter: (params: GridValueGetterParams) => {
        return params.value.name;
      },
      valueSetter: (params: GridValueSetterParams) => {
        const discipine = disciplines.find((d) => d.name == params.value);
        return { ...params.row, discipline: discipine };
      },
      width: 150,
    },
    {
      field: 'group',
      headerName: 'Gruppe',
      editable: true,
      width: 150,
      preProcessEditCellProps: preProcessEditCellPropsForNonEmptyString,
      renderEditCell: renderNonEmptyStringCell,
    },
    {
      field: 'participantCount',
      headerName: 'Teilnehmer',
      type: 'number',
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
      width: 100,
      editable: true,
      valueOptions: ['27€', '21€', '19€', '16€'],
      valueGetter: (params: GridValueGetterParams) => {
        const euroValue = params.value / 100;
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
      headerName: 'bearbeiten',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ id }) => {
        const thisTraining = trainings.find((t) => t.id === id) as Row;
        if (!thisTraining) {
          // this happens when we render after add a new training has been added and the state has not yet been fully updated.
          return [];
        }

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

        if (thisTraining.status === TrainingStatus.NEW) {
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
      headerName: 'freigeben',
      getActions: ({ id }) => {
        const thisTraining = trainings.find((t) => t.id === id);
        if (!thisTraining) {
          return [];
        }
        switch (thisTraining.status) {
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
        }
      },
    },
  ];
}

type TrainingTableToolbarProps = {
  refresh: () => void;
  setRows: SetTrainings;
  setRowModesModel: (
    newModel: (oldModel: GridRowModesModel) => GridRowModesModel,
  ) => void;
  userName: string;
  userId: string;
  /** A default discipline to be used for complete new entries. */
  defaultDiscipline: DisciplineDto;
  allowAddTraining: boolean;
};

function TrainingTableToolbar({
  refresh,
  setRows,
  setRowModesModel,
  userName,
  userId,
  defaultDiscipline,
  allowAddTraining,
}: TrainingTableToolbarProps) {
  return (
    <GridToolbarContainer>
      {allowAddTraining ? (
        <Button
          startIcon={<AddIcon />}
          onClick={() => {
            const id = uuidv4();
            setRows((oldRows: Training[]): Training[] => {
              let template = null;
              if (oldRows.length === 0) {
                template = {
                  date: dayjs().format('YYYY-MM-DD'),
                  discipline: defaultDiscipline,
                  group: '',
                  compensationCents: 1900,
                  userName: userName,
                  userId: userId,
                };
              } else {
                template = { ...getNewestTraining(oldRows) };
              }

              return [
                ...oldRows,
                {
                  ...template,
                  id: id,
                  isNew: true,
                  participantCount: 0,
                  status: TrainingStatus.NEW,
                } as Row,
              ];
            });
            setRowModesModel((oldModel) => ({
              ...oldModel,
              [id]: {
                mode: GridRowModes.Edit,
                fieldToFocus: 'date',
                deleteValue: true,
              },
            }));
          }}
        >
          Training hinzufügen
        </Button>
      ) : (
        <></>
      )}
      <Button startIcon={<RefreshIcon />} onClick={refresh}>
        neu laden
      </Button>
    </GridToolbarContainer>
  );
}

interface Row extends Training {
  isNew?: boolean;
}

type SetTrainings = React.Dispatch<React.SetStateAction<Training[]>>;

type TrainingTableProps = {
  /** The trainings to display. Note: SHould be sorted, e.g. with `v.sort((r1, r2) => parseInt(r1.id) - parseInt(r2.id))` */
  trainings: Training[];
  setTrainings: SetTrainings;
  refresh: () => Promise<Training[]>;
  /** Whether the UI should show the approval actions. (User must be admin to actually execute the steps.) */
  approvalMode: boolean;
  /** A list of disciplines for the dropdown. */
  disciplines: DisciplineDto[];
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
}: TrainingTableProps) {
  const backend = React.useRef(new Backend());
  const [rowModesModel, setRowModesModel] = React.useState<GridRowModesModel>(
    {},
  );
  const [showDeleteDialog, setShowDeleteDialog] =
    React.useState<boolean>(false);
  const [trainingToDelete, setTrainingToDelete] =
    React.useState<Training | null>(null);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const handleCancelClick = (id: GridRowId) => () => {
    setRowModesModel({
      ...rowModesModel,
      [id]: { mode: GridRowModes.View, ignoreModifications: true },
    });
    // If pressed the cancel button while we were editing a new row, we remove it from the trainings.
    const editedRow = trainings.find((row) => row.id === id) as Row;
    if (editedRow!.isNew) {
      setTrainings(trainings.filter((row) => row.id !== id));
    }
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
    backend.current.approveTraining(id as string).then(refresh);
  };

  const handleRevokeClick = (id: GridRowId) => () => {
    backend.current.unapproveTraining(id as string).then(refresh);
  };

  const handleDeleteConfirmation = async (ok: boolean) => {
    if (ok && trainingToDelete) {
      // FIXME no complete refresh!
      await backend.current.deleteTraining(trainingToDelete.id).then(refresh);
    }
    setShowDeleteDialog(false);
  };

  /** This function is called when an edited row is saved. It will synchronize the changes to the backend. */
  const processRowUpdate = React.useCallback(
    async (updatedRow: Row, originalRow: Row): Promise<Row> => {
      if (!trainingIsValid(updatedRow)) {
        console.log('Training is not valid!');
        return originalRow;
      }
      if (updatedRow.isNew) {
        return backend.current
          .addTraining(
            updatedRow.date,
            updatedRow.discipline.id,
            updatedRow.group,
            updatedRow.compensationCents,
            updatedRow.participantCount,
            session.userId,
          )
          .then((createdTraining) => {
            // update the list of trainings where we replace the created entry with the one from the backend.
            setTrainings(
              trainings.map((t) =>
                t.id === originalRow.id ? createdTraining : t,
              ),
            );
            return createdTraining;
          });
      } else {
        return backend.current.updateTraining(
          updatedRow.id,
          updatedRow.date,
          updatedRow.discipline.id,
          updatedRow.group,
          updatedRow.compensationCents,
          updatedRow.participantCount,
        );
      }
    },
    [trainings, setTrainings, session.userId],
  );

  React.useEffect(() => {
    if (authenticationStatus === 'authenticated') {
      backend.current.setAccessToken(session.accessToken);
    }
  }, [authenticationStatus, session.accessToken]);

  const columns = getGridColumns(
    trainings,
    disciplines,
    rowModesModel,
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
            refresh,
            setRows: setTrainings,
            setRowModesModel,
            userName: session.name,
            userId: session.userId,
            allowAddTraining: approvalMode == false,
            defaultDiscipline: disciplines.at(0),
          },
        }}
      />
      <DeleteTrainingDialog
        open={showDeleteDialog}
        training={trainingToDelete}
        onUserChoice={handleDeleteConfirmation}
      />
    </>
  );
}
