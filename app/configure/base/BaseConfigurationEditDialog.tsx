import { CompensationClassDto, ConfigurationValueDto } from '@/lib/dto';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import { ConfigKey } from '@/app/api/configuration/configuration';
import React from 'react';
import dayjs from 'dayjs';
import { Controller, useForm } from 'react-hook-form';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

type FormData = {
  value: string;
};

export function BaseConfigurationEditDialog(props: {
  open: boolean;
  toEdit: ConfigurationValueDto | null;
  handleClose: () => void;
  handleSave: (data: ConfigurationValueDto) => void;
  title: string;
}) {
  const [previousValue, setPreviousValue] =
    React.useState<ConfigurationValueDto | null>();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormData>();

  React.useEffect(() => {
    if (props.toEdit !== previousValue) {
      if (props.toEdit?.key === ConfigKey.MAX_COMPENSATION_CENTS_PER_YEAR) {
        reset({
          value: props.toEdit.value.substring(0, props.toEdit.value.length - 2),
        });
      } else {
        reset({ value: props.toEdit?.value ?? '' });
      }

      setPreviousValue(props.toEdit);
    }
  }, [props.toEdit]);

  const onSubmit = (data: FormData) => {
    if (isValid) {
      if (props.toEdit?.key === ConfigKey.MAX_COMPENSATION_CENTS_PER_YEAR) {
        props.handleSave({
          key: props.toEdit?.key ?? '',
          value: data.value + '00',
        });
      } else {
        props.handleSave({
          key: props.toEdit?.key ?? '',
          value: data.value,
        });
      }
      props.handleClose();
      reset();
    }
  };

  return (
    <Dialog open={props.open} onClose={props.handleClose}>
      <DialogTitle>Wert bearbeiten</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <DialogContentText>
              Wert für "{props.title}" bearbeiten.
            </DialogContentText>
            <Controller
              name="value"
              control={control}
              rules={{ required: true, pattern: /^[0-9]+$/ }}
              render={({ field: props }) => (
                <TextField
                  {...props}
                  label="Wert"
                  required={true}
                  {...register('value')}
                  error={!!errors.value?.message}
                  helperText={errors.value?.message || ''}
                />
              )}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              props.handleClose();
              reset();
            }}
          >
            Abbrechen
          </Button>
          <Button type="submit">Speichern</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
