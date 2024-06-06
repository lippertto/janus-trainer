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
import { InputAdornment } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { useConfirm } from 'material-ui-confirm';
import { CompensationValueDto } from '@/lib/dto';

type CompensationCardProps = {
  values: CompensationValueDto[],
  handleAddCompensationValue: (cents: number, description: string) => void
  handleDeleteCompensationValue: (id: number) => void
}

function compensationValueToListItem(
  cv: CompensationValueDto,
  handleDeleteClick: (value: CompensationValueDto) => void,
) {
  const text = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cv.cents / 100);
  return <ListItem key={cv.id} secondaryAction={
    <IconButton
      edge="end"
      onClick={() => {
        handleDeleteClick(cv);
      }}>
      <DeleteIcon />
    </IconButton>
  }>
    <ListItemText primary={text} secondary={cv.description} />
  </ListItem>;
}

type AddCompensationValueDialogProps = {
  open: boolean;
  handleClose: () => void;
  handleConfirm: (cents: number, description: string) => void;
}

function isValidCentValue(value: string): boolean {
  const regex = /^[1-9][0-9]*(,[0-9][0-9])?$/;
  return regex.test(value);
}

function AddCompensationValueDialog({ open, handleClose, handleConfirm }: AddCompensationValueDialogProps) {
  const [cents, setCents] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');

  const centsErrorString = isValidCentValue(cents) ? ' ' : 'Bitte einen validen Betrag eingeben';
  const descriptionIsEmpty = description === '';

  return <Dialog open={open}>
    <DialogTitle>Vergütung hinzufügen</DialogTitle>
    <DialogContent>
      <Stack>
        <TextField
          label="Betrag"
          value={cents}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setCents(event.target.value);
          }}
          // needs to be set in Dialogs according to https://github.com/mui/material-ui/issues/29892#issuecomment-979745849
          margin="dense"
          inputProps={{
            // 'data-testid': 'enter-discipline-textfield',
          }}
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
      </Stack>
    </DialogContent>
    <DialogActions>
      <Button onClick={() => {
        handleClose();
        setCents('');
        setDescription('');
      }}>Abbrechen</Button>
      <Button
        disabled={centsErrorString !== ' ' || descriptionIsEmpty}
        onClick={() => {
          handleConfirm(parseInt(cents) * 100, description);
          setCents('');
          setDescription('');
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
      title: "Vergütung löschen?",
      description: `Soll die Vergütung "${deletionCandidate.description}" gelöscht werden?`
    })
      .then(
        () => handleDeleteCompensationValue(deletionCandidate!.id)
      );
  }

  return <React.Fragment>
    <Card>
      <CardHeader title={'Vergütungen'} />
      <CardContent>
        <List style={{ maxHeight: 500, overflow: 'auto' }}>
          {values.map((v) => compensationValueToListItem(v, handleDeleteClick))}
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