import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import React from 'react';
import InputAdornment from '@mui/material/InputAdornment';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { useForm } from 'react-hook-form';
import {
  CompensationValueCreateRequest,
  CompensationValueDto,
} from '@/lib/dto';

export default function CompensationValueDialog(props: {
  open: boolean;
  toEdit: CompensationValueDto | null;
  handleClose: () => void;
  handleSave: (data: CompensationValueCreateRequest) => void;
}) {
  const [previousCompensationValue, setPreviousCompensationValue] =
    React.useState<CompensationValueDto | null>();

  type FormData = {
    description: string;
    cents: string;
    durationMinutes: string;
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormData>();

  React.useEffect(() => {
    if (props.toEdit !== previousCompensationValue) {
      let cents = props.toEdit?.cents;
      if (cents) {
        cents = cents / 100;
      }
      const defaultValues = {
        description: props.toEdit?.description ?? '',
        cents: cents?.toString() ?? '',
        durationMinutes: props.toEdit?.durationMinutes?.toString() ?? '',
      };
      reset(defaultValues);
      setPreviousCompensationValue(props.toEdit);
    }
  }, [props.toEdit]);

  const onSubmit = (data: FormData) => {
    if (isValid) {
      props.handleSave({
        description: data.description,
        cents: Math.round(parseFloat(data.cents.replace(',', '.')) * 100),
        durationMinutes: parseInt(data.durationMinutes),
      });
      props.handleClose();
      reset();
    }
  };

  return (
    <Dialog open={props.open}>
      <DialogTitle>
        {props.toEdit ? 'Pauschale bearbeiten' : 'Pauschale hinzufügen'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Betrag"
              required={true}
              {...register('cents', {
                pattern: {
                  value: /^\d+(,\d{0,2})?$/,
                  message: 'Muss ein valider Betrag sein)',
                },
              })}
              error={!!errors.cents?.message}
              helperText={errors.cents?.message || ''}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">€</InputAdornment>
                ),
                name: 'cents',
              }}
              data-testid="cents-input"
            />
            <TextField
              label="Bezeichnung"
              required={true}
              {...register('description')}
              error={!!errors.description?.message}
              helperText={errors.description?.message || ''}
              data-testid="description-input"
            />

            <TextField
              label="Dauer (optional)"
              type="number"
              {...register('durationMinutes')}
              inputProps={{ min: 0 }}
              error={!!errors.durationMinutes?.message}
              helperText={errors.durationMinutes?.message || ''}
              data-testid="durationMinutes-input"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              props.handleClose();
              reset();
            }}
            data-testid="cancel-button"
          >
            Abbrechen
          </Button>
          <Button type="submit" data-testid="submit-button">
            Speichern
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
