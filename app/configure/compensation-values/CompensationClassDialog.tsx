import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import React from 'react';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { useForm } from 'react-hook-form';
import {
  CompensationClassDto,
  CompensationClassUpdateRequest,
} from '@/lib/dto';

export default function CompensationClassDialog(props: {
  open: boolean;
  toEdit: CompensationClassDto | null;
  handleClose: () => void;
  handleSave: (data: CompensationClassUpdateRequest) => void;
}) {
  const [previousValue, setPreviousValue] =
    React.useState<CompensationClassDto | null>();

  type FormData = {
    name: string;
  };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormData>();

  React.useEffect(() => {
    if (props.toEdit !== previousValue) {
      const defaultValues = {
        name: props.toEdit?.name ?? '',
      };
      reset(defaultValues);
      setPreviousValue(props.toEdit);
    }
  }, [props.toEdit]);

  const onSubmit = (data: FormData) => {
    if (isValid) {
      props.handleSave({
        name: data.name,
      });
      props.handleClose();
      reset();
    }
  };

  return (
    <Dialog open={props.open}>
      <DialogTitle>
        {props.toEdit
          ? 'Pauschalen-Gruppe bearbeiten'
          : 'Pauschalen-Gruppe hinzufügen'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField
              label="Name"
              required={true}
              {...register('name')}
              error={!!errors.name?.message}
              helperText={errors.name?.message || ''}
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
