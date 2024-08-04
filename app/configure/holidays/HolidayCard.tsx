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
import { DataGrid, GridActionsCellItem, GridColDef } from '@mui/x-data-grid';

import dayjs from 'dayjs';

import Box from '@mui/material/Box';
import { Holiday } from '@prisma/client';
import { useConfirm } from 'material-ui-confirm';
import { dateToHumanReadable } from '@/lib/formatters';

function HolidayTable({
  rows,
                        handleDeleteClick,
}: {
  rows: Holiday[];
  handleDeleteClick: (holiday: Holiday | null) => void;
}) {
  const columns: GridColDef[] = [
    {
      headerName: 'Start',
      type: 'date',
      field: 'start',
      valueFormatter: (value: string) => {
        return dateToHumanReadable(value);
      },
      flex: 1,
    },
    {
      headerName: 'Ende',
      type: 'date',
      field: 'end',
      valueFormatter: (value: string) => {
        return dateToHumanReadable(value);
      },
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
        const holiday = rows.find((h) => h.id === id);
        return [
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label="bearbeiten"
            onClick={() => {
              handleDeleteClick(holiday ?? null);
            }}
            data-testid={`delete-holiday-${holiday?.name}`}
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
            minDate={start ?? undefined}
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
  handleDeleteHoliday: (holiday: Holiday) => void;
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

  const confirm = useConfirm();
  const handleDeleteClick = (holiday: Holiday|null) => {
    if (!holiday) return;
    confirm({
      title: 'Feiertag löschen?',
      description: `Soll der Feiertag ${holiday.name} wirklich gelöscht werden?`
    }).then(()=>{
      handleDeleteHoliday(holiday);
    })
  }

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
            handleDeleteClick={handleDeleteClick}
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
    </>
  );
}
