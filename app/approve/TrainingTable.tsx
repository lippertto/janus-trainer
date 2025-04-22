import React from 'react';

import dayjs from 'dayjs';

import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRowId,
  GridRowParams,
  GridRowSelectionModel,
  useGridApiRef,
} from '@mui/x-data-grid';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FastForwardIcon from '@mui/icons-material/FastForward';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import Tooltip from '@mui/material/Tooltip';
import { Holiday, TrainingStatus } from '@prisma/client';
import { TrainingDto, TrainingDuplicateDto } from '@/lib/dto';
import {
  centsToHumanReadable,
  dateToHumanReadable,
  getDateFromIso8601,
  trainingStatusToHumanReadable,
} from '@/lib/formatters';
import { warningsForDate } from '@/lib/warnings-for-date';

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
      row.course!.weekday,
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
      width: 50,
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
        return `${row.course?.name}`;
      },
    },
    {
      field: 'duration',
      headerName: 'Zeit lt. Plan',
      valueGetter: (_value, row: TrainingDto) => {
        const hour = row.course?.startHour?.toString().padStart(2, '0') ?? '';
        const minute =
          row.course?.startMinute?.toString().padStart(2, '0') ?? '';
        return `${hour}:${minute}/${row.course!.durationMinutes}min`;
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

/**
 * Renders a list of Trainings.
 *
 * The component keeps a separate state for the trainings so that we can immediately update the UI.
 * Changing the training statuses will trigger a refresh of list of the trainers.
 * The refresh function has been throttled to keep the load low.
 */
export function TrainingTable(props: {
  /** List of holidays used to highlight collisions */
  holidays: Holiday[];
  getTrainings: () => TrainingDto[];
  getDuplicates: (trainingIds: number[]) => TrainingDuplicateDto[];
  setSelectedTraining: (v: TrainingDto | null) => void;
  approveTraining: (v: {
    trainings: TrainingDto[];
    trainingId: number;
  }) => void;
  revokeTraining: (v: { trainings: TrainingDto[]; trainingId: number }) => void;
}) {
  const [rowSelectionModel, setRowSelectionModel] =
    React.useState<GridRowSelectionModel>({
      type: 'include',
      ids: new Set([]),
    });
  const apiRef = useGridApiRef();

  const trainings = props.getTrainings();
  const duplicates = props.getDuplicates(trainings.map((t) => t.id));

  const columns = React.useMemo(
    () =>
      buildGridColumns(
        props.holidays,
        duplicates,
        (trainingId: GridRowId) => () =>
          props.approveTraining({
            trainings,
            trainingId: trainingId as number,
          }),
        (trainingId: GridRowId) => () =>
          props.revokeTraining({ trainings, trainingId: trainingId as number }),
      ),
    [props.holidays, duplicates],
  );

  React.useEffect(() => {
    apiRef.current!.autosizeColumns({});
  }, [trainings]);

  return (
    <>
      <DataGrid
        apiRef={apiRef}
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
          if (newValue.ids.size === 0) {
            props.setSelectedTraining(null);
          } else {
            props.setSelectedTraining(
              trainings.find(
                (t) => t?.id === (newValue.ids.values().next().value as number),
              ) ?? null,
            );
          }
          setRowSelectionModel(newValue);
        }}
        autosizeOnMount
      />
    </>
  );
}
