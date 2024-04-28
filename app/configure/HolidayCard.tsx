import React from 'react';

import DeleteIcon from '@mui/icons-material/Delete';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';

import TextField from '@mui/material/TextField';

import { DatePicker } from '@mui/x-date-pickers';
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRowId,
} from '@mui/x-data-grid';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import { toHumanReadableDate } from '@/lib/datagrid-utils';
import { Typography } from '@mui/material';
import { Holiday } from '@prisma/client';

function HolidayTable({
  rows,
  setHolidayToDelete,
}: {
  rows: Holiday[];
  setHolidayToDelete: (holiday: Holiday | null) => void;
}) {
  const columns: GridColDef[] = [
    {
      headerName: 'Start',
      type: 'date',
      field: 'start',
      valueFormatter: toHumanReadableDate,
      flex: 1,
    },
    {
      headerName: 'Ende',
      type: 'date',
      field: 'end',
      valueFormatter: toHumanReadableDate,
      flex: 1,
    },
    {
      headerName: 'Beschreibung',
      type: 'string',
      field: 'name',
      flex: 2,
    },
    {
      field: 'actions',
      headerName: '',
      type: 'actions',
      flex: 0.2,
      getActions: ({ id }) => {
        return [
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label="bearbeiten"
            onClick={() => {
              const holiday = rows.find((h) => h.id === id);
              setHolidayToDelete(holiday ?? null);
            }}
            key={id}
          />,
        ];
      },
    },
  ];
  return (
    <DataGrid
      data-testid="holiday-table"
      rows={rows}
      columns={columns}
      initialState={{
        sorting: {
          sortModel: [{ field: 'start', sort: 'asc' }],
        },
      }}
      hideFooter={true}
    />
  );
}

type DeleteHolidayDialogProps = {
  open: boolean;
  handleUserChoice: (confirmed: boolean) => void;
  holiday: Holiday | null;
};

function DeleteHolidayDialog({
  open,
  holiday,
  handleUserChoice,
}: DeleteHolidayDialogProps) {
  return (
    <Dialog open={open}>
      <DialogTitle>Feiertag löschen</DialogTitle>
      <DialogContent>
        <Typography>Den Feiertag {holiday?.name} wirklich löschen?</Typography>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            handleUserChoice(false);
          }}
        >
          Abbrechen
        </Button>
        <Button
          onClick={() => {
            handleUserChoice(true);
          }}
          color="error"
          autoFocus
        >
          Löschen
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type EnterHolidayDialogProps = {
  open: boolean;
  handleClose: () => void;
  handleSave: (start: dayjs.Dayjs, end: dayjs.Dayjs, name: string) => void;
};

function EnterHolidayDialog({
  open,
  handleClose,
  handleSave,
}: EnterHolidayDialogProps) {
  const [start, setStart] = React.useState<dayjs.Dayjs | null>(null);
  const [end, setEnd] = React.useState<dayjs.Dayjs | null>(null);
  const [name, setName] = React.useState<string>('');

  const resetValues = React.useCallback(() => {
    setStart(null);
    setEnd(null);
    setName('');
  }, [setStart, setEnd, setName]);

  const endIsBeforeStart = start && end ? start.diff(end) > 0 : false;
  let startErrorMessage = null;
  if (!start) {
    startErrorMessage = 'Muss gesetzt sein';
  } else if (!start.isValid()) {
    startErrorMessage = 'Ist kein Datum';
  }

  let endErrorMessage = null;
  if (!end) {
    if (start) {
      endErrorMessage = 'Muss gesetzt sein';
    }
  } else if (!end.isValid()) {
    endErrorMessage = 'Ist kein Datum';
  } else if (endIsBeforeStart) {
    endErrorMessage = 'Darf nicht vor dem Start liegen';
  }

  let nameErrorMessage = null;
  if (start && end && name.length === 0) {
    nameErrorMessage = 'Darf nicht leer sein';
  }

  const notYetValid =
    Boolean(startErrorMessage) ||
    Boolean(endErrorMessage) ||
    Boolean(nameErrorMessage);

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Neuen Feiertag hinzufügen</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <Box sx={{ m: 1 }} />
          <DatePicker
            label="Start"
            value={start}
            onChange={(v) => {
              setStart(v);
            }}
            slotProps={{
              textField: {
                // we have to use id, because data-testid is not passed on
                id: 'holiday-date-picker-start',
                error: !!startErrorMessage,
                helperText: startErrorMessage,
              },
            }}
          />
          <DatePicker
            label="Ende"
            value={end}
            onChange={(v) => {
              setEnd(v);
            }}
            disabled={!start}
            minDate={start}
            slotProps={{
              textField: {
                id: 'holiday-date-picker-end',
                error: !!endErrorMessage,
                helperText: endErrorMessage,
              },
            }}
          />
          <TextField
            label="Beschreibung"
            data-testid="holiday-text-field-description"
            value={name}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setName(event.target.value);
            }}
            // needs to be set in Dialogs according to https://github.com/mui/material-ui/issues/29892#issuecomment-979745849
            margin="dense"
            error={!!nameErrorMessage}
            helperText={nameErrorMessage}
            disabled={!(start && end)}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            handleClose();
            setTimeout(resetValues, 100);
          }}
        >
          Abbrechen
        </Button>
        <Button
          data-testid="holiday-button-submit"
          disabled={notYetValid}
          onClick={() => {
            handleSave(start!, end!, name);
            handleClose();
            setTimeout(resetValues, 100);
          }}
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type HolidayCardProps = {
  holidays: Holiday[];
  handleAddHoliday: (
    start: dayjs.Dayjs,
    end: dayjs.Dayjs,
    name: string,
  ) => void;
  handleDeleteHoliday: (id: GridRowId) => void;
  holidayYear: number;
  setHolidayYear: React.Dispatch<React.SetStateAction<number>>;
};

export default function HolidayCard({
  holidays,
  handleAddHoliday,
  handleDeleteHoliday,
  holidayYear,
  setHolidayYear,
}: HolidayCardProps) {
  const [showEnterDialog, setShowEnterDialog] = React.useState<boolean>(false);
  const [holidayToDelete, setHolidayToDelete] = React.useState<Holiday | null>(
    null,
  );

  const handleDeleteChoice = React.useCallback(
    (confirmed: boolean) => {
      if (confirmed && holidayToDelete) {
        handleDeleteHoliday(holidayToDelete.id);
      }
      setHolidayToDelete(null);
    },
    [setHolidayToDelete, holidayToDelete, handleDeleteHoliday],
  );

  return (
    <>
      <Card>
        <CardHeader title={'Feiertage'} />
        <CardContent>
          <DatePicker
            views={['year']}
            label="Anzeige für Jahr"
            value={dayjs(`${holidayYear}-01-01`)}
            onChange={(value) => {
              if (!value) return;
              setHolidayYear(value.year());
            }}
            sx={{ mb: 3 }}
          />

          <HolidayTable
            rows={holidays}
            setHolidayToDelete={setHolidayToDelete}
          />
        </CardContent>
        <CardActions>
          <Button
            onClick={() => {
              setShowEnterDialog(true);
            }}
            data-testid="add-holiday-button"
          >
            Feiertag hinzufügen
          </Button>
        </CardActions>
      </Card>
      <EnterHolidayDialog
        open={showEnterDialog}
        handleClose={() => setShowEnterDialog(false)}
        handleSave={handleAddHoliday}
      />
      <DeleteHolidayDialog
        open={Boolean(holidayToDelete)}
        holiday={holidayToDelete}
        handleUserChoice={handleDeleteChoice}
      />
    </>
  );
}
