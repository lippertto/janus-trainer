import React from 'react';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import InputAdornment from '@mui/material/InputAdornment';
import { useConfirm } from 'material-ui-confirm';
import { CompensationValueCreateRequest, CompensationValueDto } from '@/lib/dto';
import { centsToDisplayString, compensationGroupToHumanReadable } from '@/lib/formatters';
import { CompensationGroup } from '@prisma/client';
import Autocomplete from '@mui/material/Autocomplete';
import { compensationValuesSuspenseQuery } from '@/lib/shared-queries';
import { JanusSession } from '@/lib/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInApi, deleteFromApi, updateInApi } from '@/lib/fetch';
import { API_COMPENSATION_VALUES } from '@/lib/routes';
import { showError, showSuccess } from '@/lib/notifications';
import ButtonGroup from '@mui/material/ButtonGroup';
import ListItemButton from '@mui/material/ListItemButton';
import { replaceElementWithId } from '@/lib/sort-and-filter';

function CompensationValueListItem(
  props: {
    compensationValue: CompensationValueDto,
    selected: boolean,
    handleClick: (cv: CompensationValueDto) => void,
  },
  key: string,
) {
  const { compensationValue } = props;
  let secondary=`${compensationGroupToHumanReadable(compensationValue.compensationGroup)}`
  if (compensationValue.durationMinutes) {
    secondary += `, ${compensationValue.durationMinutes}min`
  }
  return <ListItemButton
    key={key} onClick={() => props.handleClick(compensationValue)}
    selected={props.selected}>
    <ListItemText primary={`${compensationValue.description}: ${centsToDisplayString(compensationValue.cents)}`}
                  secondary={secondary}
    />
  </ListItemButton>;
}

type AddCompensationValueDialogProps = {
  open: boolean;
  handleClose: () => void;
  handleConfirm: (c: CompensationValueCreateRequest) => void;
  toEdit: CompensationValueDto | null;
}

function isValidCentValue(value: string): boolean {
  const regex = /^[1-9][0-9]*(,[0-9][0-9])?$/;
  return regex.test(value);
}

function AddCompensationValueDialog({ open, handleClose, handleConfirm, toEdit }: AddCompensationValueDialogProps) {
  const [cents, setCents] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [durationMinutes, setDurationMinutes] = React.useState<string>('');
  const [compensationGroup, setCompensationGroup] = React.useState<CompensationGroup | null>(null);
  const [previousToEdit, setPreviousToEdit] = React.useState<CompensationValueDto | null>(null);

  if (toEdit !== previousToEdit) {
    setPreviousToEdit(toEdit);
    if (toEdit) {
      setCents((toEdit.cents / 100).toString());
      setDescription(toEdit.description);
      setDurationMinutes(toEdit.durationMinutes?.toString() ?? '');
      setCompensationGroup(toEdit.compensationGroup);
    } else {
      setCents('');
      setDescription('');
      setDurationMinutes('');
      setCompensationGroup(null);
    }
  }

  const centsErrorString = isValidCentValue(cents) ? ' ' : 'Bitte einen validen Betrag eingeben';
  const descriptionIsEmpty = description === '';
  const noGroupSelected = compensationGroup === null;

  return <Dialog open={open}>
    <DialogTitle>Pauschale hinzufügen</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ mt: 2 }}>
        <TextField
          label="Betrag"
          value={cents}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setCents(event.target.value);
          }}
          // needs to be set in Dialogs according to https://github.com/mui/material-ui/issues/29892#issuecomment-979745849
          margin="dense"
          inputProps={{}}
          error={centsErrorString !== ' '}
          helperText={centsErrorString}
          InputProps={{
            startAdornment: <InputAdornment position="start">€</InputAdornment>,
          }}
        />
        <TextField
          label="Bezeichnung"
          value={description}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setDescription(event.target.value);
          }}
          margin={'dense'}
          error={descriptionIsEmpty}
          helperText={descriptionIsEmpty ? 'Bitte eine Beschreibung eintragen' : ' '}
        />

        <TextField
          value={durationMinutes}
          onChange={((v) => setDurationMinutes(v.target.value))}
          label={'Dauer (optional)'}
          type={'number'}
          inputProps={{ min: 0, step: 15 }}
        />

        <Autocomplete
          options={Object.keys(CompensationGroup) as CompensationGroup[]}
          renderInput={(params) => <TextField {...params} label="Pauschalen-Gruppe"
                                              error={noGroupSelected}
                                              helperText={noGroupSelected ? 'Pauschalen-Gruppe wählen' : null}
          />}
          getOptionLabel={compensationGroupToHumanReadable}
          value={compensationGroup}
          onChange={(_, value) => setCompensationGroup(value)}
        />
      </Stack>

    </DialogContent>
    <DialogActions>
      <Button onClick={() => {
        handleClose();
      }}>Abbrechen</Button>
      <Button
        disabled={centsErrorString !== ' ' || descriptionIsEmpty || noGroupSelected}
        onClick={() => {
          handleConfirm({
            cents: parseInt(cents) * 100, description,
            compensationGroup: compensationGroup!,
            durationMinutes: durationMinutes !== '' ? parseInt(durationMinutes) : null,
          });
          handleClose();
        }}>Bestätigen</Button>
    </DialogActions>
  </Dialog>;
}


export default function CompensationCard(props: {
  session: JanusSession
}) {
  const [showAddDialog, setShowAddDialog] = React.useState<boolean>(false);
  const [activeCompensationValue, setActiveCompensationValue] = React.useState<CompensationValueDto | null>(null);

  const { session } = props;
  const queryClient = useQueryClient();

  const { data: compensationValues } = compensationValuesSuspenseQuery(session.accessToken);

  const createCompensationValueMutation = useMutation({
    mutationFn: (data: CompensationValueCreateRequest) => {
      return createInApi<CompensationValueDto>(API_COMPENSATION_VALUES, data, session.accessToken);
    },
    onSuccess: (createdValue: CompensationValueDto) => {
      queryClient.setQueryData([API_COMPENSATION_VALUES], [...compensationValues, createdValue]);
      showSuccess(`Pauschale ${createdValue.description} wurde erstellt`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen der Pauschale`, e.message);
    },
  });

  const updateCompensationValueMutation = useMutation({
    mutationFn: (data: {request: CompensationValueCreateRequest, id: number}) => {
      return updateInApi<CompensationValueDto>(API_COMPENSATION_VALUES, data.id, data.request, session.accessToken);
    },
    onSuccess: (createdValue: CompensationValueDto) => {
      queryClient.setQueryData([API_COMPENSATION_VALUES], replaceElementWithId(compensationValues, createdValue));
      showSuccess(`Pauschale ${createdValue.description} wurde erstellt`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen der Pauschale`, e.message);
    },
  });

  const deleteCompensationValueMutation = useMutation({
    mutationFn: (compensationValue: CompensationValueDto) => {
      return deleteFromApi<CompensationValueDto>(API_COMPENSATION_VALUES, compensationValue, session.accessToken);
    },
    onSuccess: (deletedValue: CompensationValueDto) => {
      queryClient.setQueryData([API_COMPENSATION_VALUES], compensationValues.filter((cv) => (cv.id !== deletedValue.id)));
      showSuccess(`Pauschale ${deletedValue.description} wurde gelöscht`);
    },
    onError: (e) => {
      showError(`Fehler beim Löschen der Pauschale`, e.message);
    },
  });

  const confirm = useConfirm();
  const handleDeleteClick = () => {
    confirm({
      title: 'Pauschale löschen?',
      description: `Soll die Pauschale "${activeCompensationValue?.description}" gelöscht werden?`,
    })
      .then(
        () => deleteCompensationValueMutation.mutate(activeCompensationValue!),
      );
  };

  return <React.Fragment>
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Standard-Pauschalen </Typography>
        <ButtonGroup>
          <Button onClick={() => setShowAddDialog(true)}>
            Hinzufügen
          </Button>
          <Button disabled={!activeCompensationValue} onClick={handleDeleteClick}>
            Löschen
          </Button>
          <Button disabled={!activeCompensationValue} onClick={() => setShowAddDialog(true)}>
            Bearbeiten
          </Button>
        </ButtonGroup>
        <List style={{ maxHeight: 500, overflow: 'auto' }}>
          {compensationValues.map(
            (v) =>
              <CompensationValueListItem
                key={v.id}
                compensationValue={v}
                handleClick={setActiveCompensationValue}
                selected={activeCompensationValue === v}
              />)}
        </List>
      </Stack>
    </Paper>
    <AddCompensationValueDialog
      open={showAddDialog}
      handleClose={() => {
        setTimeout(() => setActiveCompensationValue(null), 200);
        setShowAddDialog(false);
      }}
      toEdit={activeCompensationValue}
      handleConfirm={(data) => {
        if (activeCompensationValue) {
          updateCompensationValueMutation.mutate({request: data, id: activeCompensationValue.id})
        } else {
          createCompensationValueMutation.mutate(data);
        }
      }}
    />
  </React.Fragment>;
}