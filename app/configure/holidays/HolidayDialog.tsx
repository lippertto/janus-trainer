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
import { Controller, useForm } from 'react-hook-form';
import { HolidayCreateRequest, HolidayDto } from '@/lib/dto';

type FormData = {
  start: dayjs.Dayjs;
  end: dayjs.Dayjs;
  name: string;
};

export function HolidayDialog(props: {
  open: boolean;
  handleClose: () => void;
  handleSave: (v: HolidayCreateRequest) => void;
  toEdit: HolidayDto | null;
}) {
  const [previous, setPrevious] = React.useState<HolidayDto | null>(null);

  const defaultValues = { start: dayjs(), end: dayjs(), name: '' };

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { isValid, errors },
  } = useForm<FormData>({ defaultValues });

  const onSubmit = (data: FormData) => {
    if (!isValid) return;
    props.handleSave({
      start: data.start.format('YYYY-MM-DD'),
      end: data.end.format('YYYY-MM-DD'),
      name: data.name,
    });
    props.handleClose();
    reset(defaultValues);
  };

  React.useEffect(() => {
    if (props.toEdit != previous) {
      setPrevious(props.toEdit);
      if (props.toEdit === null) {
        reset(defaultValues);
      } else {
        reset({
          start: dayjs(props.toEdit.start),
          end: dayjs(props.toEdit.end),
          name: props.toEdit.name,
        });
      }
    }
  }, [props.toEdit]);

  const start = watch('start');

  return (
    <Dialog open={props.open} onClose={props.handleClose}>
      <DialogTitle>
        {props.toEdit ? 'Feiertag bearbeiten' : 'Neuen Feiertag hinzufügen'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2}>
            <Box sx={{ m: 1 }} />

            <Controller
              control={control}
              name="start"
              rules={{
                required: true,
                validate: (v) => {
                  if (!v || !v.isValid()) return 'Muss ein Datum enthalten';
                  if (v) {
                    return true;
                  }
                },
              }}
              render={({ field: fieldProps }) => (
                <div data-testid="holiday-dialog-start-field">
                  <DatePicker
                    {...fieldProps}
                    label="Start"
                    slotProps={{
                      textField: {
                        required: true,
                        helperText: errors.start?.message || '',
                        error: Boolean(errors.start),
                      },
                    }}
                  />
                </div>
              )}
            />
            <Controller
              control={control}
              name="end"
              rules={{
                required: true,
                validate: (v) => {
                  if (!v || !v.isValid()) return 'Muss ein Datum enthalten';
                  if (v.isBefore(start)) return 'Muss nach dem Start liegen';
                  return true;
                },
              }}
              render={({ field: fieldProps }) => (
                <div data-testid="holiday-dialog-end-field">
                  <DatePicker
                    {...fieldProps}
                    label="Ende"
                    slotProps={{
                      textField: {
                        required: true,
                        helperText: errors.end?.message || '',
                        error: Boolean(errors.end),
                      },
                    }}
                  />
                </div>
              )}
            />

            <Controller
              control={control}
              name="name"
              rules={{ required: true }}
              render={({ field: fieldProps }) => (
                <TextField
                  {...fieldProps}
                  label="Beschreibung"
                  data-testid="holiday-text-field-description"
                  required={true}
                  error={!!errors.name?.message}
                  helperText={errors.name?.message || ''}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              props.handleClose();
              if (props.toEdit === null) {
                setTimeout(() => reset(defaultValues), 100);
              }
            }}
          >
            Abbrechen
          </Button>
          <Button data-testid="holiday-button-submit" type="submit">
            Speichern
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
