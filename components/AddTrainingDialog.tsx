import React from 'react';

import Button from '@mui/material/Button';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';

import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

import { DatePicker } from '@mui/x-date-pickers';

import dayjs from 'dayjs';
import { CompensationValue, Discipline, Training } from '@prisma/client';

type AddTrainingDialogProps = {
  open: boolean;
  disciplines: Discipline[];
  userId: string;
  template?: Training;
  handleClose: () => void;
  handleSave: (
    disciplineId: number,
    group: string,
    participantCount: number,
    compensation: number,
    date: string,
    userId: string,
  ) => void;
  compensationValues: CompensationValue[],
};

function compensationValueToMenuItem(cv: CompensationValue) {
  const value = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cv.cents / 100);
  const text = `${cv.description} (${value})`
  return <MenuItem value={cv.cents} key={cv.id}>
    {text}
  </MenuItem>
}

export default function AddTrainingDialog({
  open,
  disciplines,
  userId,
  template,
  handleClose,
  handleSave,
  compensationValues,
}: AddTrainingDialogProps) {
  const [discipline, setDiscipline] = React.useState<string>('6');
  const [group, setGroup] = React.useState<string>('');
  const [date, setDate] = React.useState<dayjs.Dayjs | null>(null);
  const [participantCount, setParticipantCount] = React.useState<number>(0);
  const [compensation, setCompensation] = React.useState<string>(
    compensationValues.length > 0 ? compensationValues[0].cents.toString(): "1600"
  );

  let participantCountError = " ";
  if (participantCount === 0) {
    participantCountError = 'Muss gesetzt sein';
  }

  let dateError = null;
  if (!date) {
    dateError = 'Muss gesetzt sein';
  }

  let groupError = null;
  if (group.length === 0) {
    groupError = 'Muss gesetzt sein';
  }

  const [lastTemplate, setLastTemplate] = React.useState<Training | null>();
  if (template !== lastTemplate) {
    if (template) {
      setDiscipline(template.disciplineId.toString());
    } else if (disciplines.length) {
      setDiscipline(disciplines[0].id.toString());
    }
    setGroup(template?.group ?? '');
    setDate(null);
    setParticipantCount(0);
    setCompensation(template?.compensationCents.toString() ?? '1600');
    setLastTemplate(template);
  }

  const thereIsAnError =
    Boolean(dateError) || Boolean(groupError) || participantCountError !== " ";

  return (
    <Dialog open={open}>
      <DialogTitle>Training hinzufügen</DialogTitle>
      <DialogContent>
        {/* padding is required in <Stack/> so that the label is shown */}
        <Stack spacing={2} padding={1}>
          <DatePicker
            label="Datum"
            maxDate={dayjs()}
            value={date}
            onChange={(e) => setDate(e)}
            slotProps={{
              textField: {
                error: Boolean(dateError),
                helperText: dateError,
                inputProps: { 'data-testid': 'add-training-date-field' },
              },
            }}
          />

          <TextField
            label="Sportart"
            data-testid="add-training-discipline-field"
            value={discipline}
            onChange={(event) => {
              console.log(event.target.value);
              setDiscipline(event.target.value);
            }}
            select
            sx={{ width: 300 }}
          >
            {disciplines.map((d) => (
              <MenuItem value={d.id} key={d.id}>
                {d.name}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Name der Gruppe"
            data-testid="add-training-group-field"
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
              setGroup(event.target.value);
            }}
            value={group}
            error={Boolean(groupError)}
            helperText={groupError}
          />

          <TextField
            type="number"
            label="Anzahl Teilnehmer"
            data-testid="add-training-participant-count-field"
            value={participantCount}
            onChange={(e) => setParticipantCount(parseInt(e.target.value))}
            inputProps={{ min: 1 }}
            error={participantCountError !== " "}
            helperText={participantCountError}
          />

          <TextField
            label="Vergütung"
            data-testid="add-training-compensation-field"
            select
            onChange={(e) => setCompensation(e.target.value)}
            value={compensation}
          >
            {compensationValues.map(compensationValueToMenuItem)}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Abbrechen</Button>
        <Button
          disabled={thereIsAnError}
          data-testid="add-training-save-button"
          onClick={() => {
            if (date) {
              handleSave(
                parseInt(discipline),
                group,
                participantCount,
                parseInt(compensation),
                date.format('YYYY-MM-DD'),
                userId,
              );
            }
            handleClose();
            setLastTemplate(null);
          }}
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}
