import React from 'react';
import Dialog from '@mui/material/Dialog';
import { Controller, useForm } from 'react-hook-form';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import Stack from '@mui/system/Stack';

type FormData = {
  compensation: string;
  reason: string;
};

function determineDefaultValues(currentCompensationCents: number): FormData {
  const compensationFloat = (currentCompensationCents / 100).toFixed(2);
  return {
    compensation: compensationFloat.toString().replace('.', ','),
    reason: '',
  };
}

export default function EditTrainingCompensationDialog(props: {
  open: boolean;
  onConfirm: (newValue: number, reason: string) => void;
  onClose: () => void;
  currentCompensationCents: number;
  courseName: string;
  trainingDate: string;
}) {
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormData>({
    defaultValues: determineDefaultValues(props.currentCompensationCents),
  });

  React.useEffect(() => {
    reset(determineDefaultValues(props.currentCompensationCents));
  }, [props.currentCompensationCents]);

  function onSubmit(data: FormData): void {
    if (!isValid) return;
    const compensationCents = Math.floor(
      parseFloat(data.compensation.replace(',', '.')) * 100,
    );
    props.onConfirm(compensationCents, data.reason);
    props.onClose();
  }

  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>Pauschale ändern</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              Pauschale für Training "{props.courseName}" am{' '}
              {dayjs(props.trainingDate).format('DD.MM.YYYY')} ändern
            </Typography>
            <Controller
              control={control}
              rules={{
                required: true,
                validate: (v: string) => {
                  if (!v) return true;
                  if (!/^-?\d+(,\d\d)?$/.test(v)) {
                    return 'Das sieht nicht aus wie eine Zahl';
                  }
                  return true;
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  required={true}
                  label="Pauschale"
                  error={!!errors.compensation?.message}
                  helperText={errors.compensation?.message || ''}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">€</InputAdornment>
                      ),
                    },
                  }}
                />
              )}
              name="compensation"
            />

            <Controller
              control={control}
              rules={{
                required: true,
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  onChange={(e) => field.onChange(e.target.value)}
                  required={true}
                  label="Begründung"
                  error={!!errors.reason?.message}
                  helperText={errors.reason?.message || ''}
                />
              )}
              name="reason"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={props.onClose}>Abbrechen</Button>
          <Button type="submit">Speichern</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
