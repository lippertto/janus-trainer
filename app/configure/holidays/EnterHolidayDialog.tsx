import React from 'react';
import dayjs from 'dayjs';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { DatePicker } from '@mui/x-date-pickers';
import TextField from '@mui/material/TextField';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

type EnterHolidayDialogProps = {
  open: boolean;
  handleClose: () => void;
  handleSave: (start: dayjs.Dayjs, end: dayjs.Dayjs, name: string) => void;
};

export function EnterHolidayDialog({
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