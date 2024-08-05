import Paper from '@mui/material/Paper';
import { JanusSession } from '@/lib/auth';
import Stack from '@mui/system/Stack';
import Typography from '@mui/material/Typography';
import React, { Suspense } from 'react';
import Button from '@mui/material/Button';
import ButtonGroup from '@mui/material/ButtonGroup';
import { CircularProgress } from '@mui/material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInApi } from '@/lib/fetch';
import { DisciplineCreateRequest, DisciplineDto } from '@/lib/dto';
import { API_DISCIPLINES } from '@/lib/routes';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import { useForm } from 'react-hook-form';
import { showError } from '@/lib/notifications';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { disciplinesSuspenseQuery } from '@/lib/shared-queries';
import { ClickAwayListener } from '@mui/base/ClickAwayListener';
import Box from '@mui/system/Box';

function DisciplineDialog(props: {
  open: boolean,
  toEdit: DisciplineDto | null,
  handleClose: () => void,
  handleSave: (data: DisciplineCreateRequest) => void
}) {
  const [previousDiscipline, setPreviousDiscipline] = React.useState<DisciplineDto | null>();

  type FormData = { name: string, costCenterId: string };
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid },
  } = useForm<FormData>();

  React.useEffect(() => {
    if (props.toEdit !== previousDiscipline) {
      const defaultValues = {
        name: props.toEdit?.name ?? '',
        costCenterId: props.toEdit?.costCenterId?.toString() ?? '',
      };
      reset(defaultValues);
      setPreviousDiscipline(props.toEdit);
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

  return <Dialog
    open={props.open}
  >
    <DialogTitle>{props.toEdit ? 'Kostenstelle bearbeiten' : 'Kostenstelle hinzufügen'}</DialogTitle>
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
            label="Kostenstelle" type="number"
            required={true}
            {...register('costCenterId')} error={!!errors.costCenterId?.message}
            helperText={errors.costCenterId?.message || ''}
            inputProps={{ min: 0 }}
          />
        </Stack>

      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          props.handleClose();
          reset();
        }}>Abbrechen</Button>
        <Button type="submit">Speichern</Button>
      </DialogActions>
    </form>
  </Dialog>;
}


function DisciplineList(props: {
  disciplines: DisciplineDto[],
  selectedDisciplineId: number | null,
  setSelectedDisciplineId: (v: number) => void
}) {
  return <List style={{ maxHeight: 500, overflow: 'auto' }}>
    {props.disciplines.map(
      (d) =>
        (<ListItemButton
          key={d.id}
          onClick={() => {
            props.setSelectedDisciplineId(d.id);
          }}
          selected={props.selectedDisciplineId === d.id}
        >
          <ListItemText primary={d.name} secondary={d.costCenterId} />
        </ListItemButton>))}
  </List>;
}

function DisciplineCardContents(props: { session: JanusSession }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState<boolean>(false);
  const [selectedDisciplineId, setSelectedDisciplineId] = React.useState<number | null>(null);
  const { data: disciplines } = disciplinesSuspenseQuery(props.session.accessToken);

  const disciplinesAddMutation = useMutation({
    mutationFn: (
      data: DisciplineCreateRequest,
    ) => {
      return createInApi<DisciplineDto>(API_DISCIPLINES, data, props.session.accessToken);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [API_DISCIPLINES] });
    },
    onError: () => {
      showError('Konnte Kostenstelle nicht hinzufügen');
    },
  });

  return <Stack spacing={2}>
    <ButtonGroup>
      <Button onClick={() => {
        setSelectedDisciplineId(null);
        setOpen(true);
      }}>
        Hinzufügen
      </Button>
      <Button
        onClick={() => {
          setOpen(true);
        }}
        disabled={!selectedDisciplineId}
      >
        Bearbeiten
      </Button>
    </ButtonGroup>
    <ClickAwayListener onClickAway={() => setSelectedDisciplineId(null)}>
      <Box>
      <DisciplineList disciplines={disciplines} selectedDisciplineId={selectedDisciplineId}
                      setSelectedDisciplineId={setSelectedDisciplineId} />
      </Box>
    </ClickAwayListener>
    <DisciplineDialog
      open={open}
      handleClose={() => setOpen(false)}
      handleSave={disciplinesAddMutation.mutate}
      toEdit={disciplines.find((d) => (d.id === selectedDisciplineId)) ?? null}
    />
  </Stack>;
}

export default function DisciplineCard(props: { session: JanusSession }) {
  return <Paper sx={{ p: 2 }}>
    <Stack spacing={2}>
      <Typography variant="h5">Kostenstellen</Typography>
      <Suspense fallback={<CircularProgress />}>
        <DisciplineCardContents session={props.session} />
      </Suspense>
    </Stack>
  </Paper>;
}