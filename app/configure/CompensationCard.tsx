import React from 'react';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import DialogTitle from '@mui/material/DialogTitle';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { useConfirm } from 'material-ui-confirm';
import { CompensationValueCreateRequest, CompensationValueDto } from '@/lib/dto';
import { centsToDisplayString, compensationGroupToHumanReadable } from '@/lib/formatters';
import { CompensationGroup } from '@prisma/client';
import Autocomplete from '@mui/material/Autocomplete';

type CompensationCardProps = {
  values: CompensationValueDto[],
  handleAddCompensationValue: (c: CompensationValueCreateRequest) => void
  handleDeleteCompensationValue: (cv: CompensationValueDto) => void
}

function CompensationValueListItem(
  props: {
    compensationValue: CompensationValueDto,
    handleDeleteClick: (value: CompensationValueDto) => void
  },
  key: string,
) {
  return <ListItem key={key} secondaryAction={
    <IconButton
      edge="end"
      onClick={() => {
        props.handleDeleteClick(props.compensationValue);
      }}>
      <DeleteIcon />
    </IconButton>
  }>
    <ListItemText primary={centsToDisplayString(props.compensationValue.cents)}
                  secondary={`${compensationGroupToHumanReadable(props.compensationValue.compensationGroup)}, ${props.compensationValue.description}`} />
  </ListItem>;
}

type AddCompensationValueDialogProps = {
  open: boolean;
  handleClose: () => void;
  handleConfirm: (c: CompensationValueCreateRequest) => void;
}

function isValidCentValue(value: string): boolean {
  const regex = /^[1-9][0-9]*(,[0-9][0-9])?$/;
  return regex.test(value);
}

function AddCompensationValueDialog({ open, handleClose, handleConfirm }: AddCompensationValueDialogProps) {
  const [cents, setCents] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [durationMinutes, setDurationMinutes] = React.useState<String>('60');
  const [compensationGroup, setCompensationGroup] = React.useState<CompensationGroup | null>(null);

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
          label={'Dauer'}
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
        setTimeout(() => {
          setCents('');
          setDescription('');
        }, 50);
      }}>Abbrechen</Button>
      <Button
        disabled={centsErrorString !== ' ' || descriptionIsEmpty || noGroupSelected}
        onClick={() => {
          handleConfirm({
            cents: parseInt(cents) * 100, description,
            compensationGroup: compensationGroup!,
          });
          setTimeout(() => {
            setCents('');
            setDescription('');
          }, 50);
          handleClose();
        }}>Bestätigen</Button>
    </DialogActions>
  </Dialog>;
}


export default function CompensationCard({
                                           values,
                                           handleAddCompensationValue,
                                           handleDeleteCompensationValue,
                                         }: CompensationCardProps) {
  const [showAddDialog, setShowAddDialog] = React.useState<boolean>(false);

  const confirm = useConfirm();
  const handleDeleteClick = (deletionCandidate: CompensationValueDto) => {
    confirm({
      title: 'Pauschale löschen?',
      description: `Soll die Pauschalde "${deletionCandidate.description}" gelöscht werden?`,
    })
      .then(
        () => handleDeleteCompensationValue(deletionCandidate),
      );
  };

  return <React.Fragment>
    <Card>
      <CardHeader title={'Standard-Pauschalen'} />
      <CardContent>
        <List style={{ maxHeight: 500, overflow: 'auto' }}>
          {values.map((v) => <CompensationValueListItem key={v.id} compensationValue={v}
                                                        handleDeleteClick={handleDeleteClick} />)}
        </List>
      </CardContent>
      <CardActions>
        <Button onClick={() =>
          setShowAddDialog(true)
        }
        >Hinzufügen</Button>
      </CardActions>
    </Card>
    <AddCompensationValueDialog
      open={showAddDialog}
      handleClose={() => setShowAddDialog(false)}
      handleConfirm={handleAddCompensationValue}
    />
  </React.Fragment>;
}