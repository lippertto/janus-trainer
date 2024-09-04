import { DisciplineCreateRequest, DisciplineDto } from '@/lib/dto';
import React from 'react';
import { useForm } from 'react-hook-form';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Stack from '@mui/system/Stack';
import TextField from '@mui/material/TextField';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

type FormData = { name: string; costCenterId: string };

function defaultValuesFor(toEdit: DisciplineDto | null): FormData {
  return {
    name: toEdit?.name ?? '',
    costCenterId: toEdit?.costCenterId?.toString() ?? '',
  };
}

export function DisciplineDialog(props: {
  open: boolean;
  toEdit: DisciplineDto | null;
  handleClose: () => void;
  handleSave: (data: DisciplineCreateRequest) => void;
}) {
  const [previous, setPrevious] = React.useState<DisciplineDto | null>();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormData>();

  React.useEffect(() => {
    if (props.toEdit !== previous) {
      reset(defaultValuesFor(props.toEdit));
      setPrevious(props.toEdit);
    }
  }, [props.toEdit]);

  const onSubmit = (data: FormData) => {
    if (isValid) {
      props.handleSave({
        name: data.name,
        costCenterId: parseInt(data.costCenterId),
      });
      props.handleClose();
      reset();
    }
  };

  return (
    <Dialog open={props.open}>
      <DialogTitle>
        {props.toEdit ? 'Kostenstelle bearbeiten' : 'Kostenstelle hinzufügen'}
      </DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack direction={'column'} spacing={2}>
            <TextField
              label="Name"
              required={true}
              {...register('name')}
              error={!!errors.name?.message}
              helperText={errors.name?.message || ''}
            />
            <TextField
              label="Kostenstelle"
              type="number"
              required={true}
              {...register('costCenterId')}
              error={!!errors.costCenterId?.message}
              helperText={errors.costCenterId?.message || ''}
              inputProps={{ min: 0 }}
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
