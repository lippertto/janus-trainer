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
import RadioGroup from '@mui/material/RadioGroup';
import Radio from '@mui/material/Radio';
import InputAdornment from '@mui/material/InputAdornment';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import DeleteIcon from '@mui/icons-material/Delete';
import { useConfirm } from 'material-ui-confirm';
import { CompensationValueCreateRequest, CompensationValueDto } from '@/lib/dto';
import { centsToDisplayString } from '@/lib/formatters';
import FormLabel from '@mui/material/FormLabel';
import FormControlLabel from '@mui/material/FormControlLabel';
import { Qualification } from '@prisma/client';

type CompensationCardProps = {
  values: CompensationValueDto[],
  handleAddCompensationValue: (c: CompensationValueCreateRequest) => void
  handleDeleteCompensationValue: (cv: CompensationValueDto) => void
}

function CompensationValueListItem(
  props: {
  compensationValue: CompensationValueDto,
  handleDeleteClick: (value: CompensationValueDto) => void},
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
    <ListItemText primary={centsToDisplayString(props.compensationValue.cents)} secondary={props.compensationValue.description}/>
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
  const [qualification, setQualification] = React.useState<Qualification>('ANY')
  const [durationMinutes, setDurationMinutes] = React.useState<String>("60");

  const centsErrorString = isValidCentValue(cents) ? ' ' : 'Bitte einen validen Betrag eingeben';
  const descriptionIsEmpty = description === '';

  return <Dialog open={open}>
    <DialogTitle>Pauschale hinzufügen</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{mt: 2}}>
        <TextField
          label="Betrag"
          value={cents}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setCents(event.target.value);
          }}
          // needs to be set in Dialogs according to https://github.com/mui/material-ui/issues/29892#issuecomment-979745849
          margin="dense"
          inputProps={{
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

        <TextField
          value={durationMinutes}
          onChange={((v) => setDurationMinutes(v.target.value))}
          label={'Dauer'}
          type={'number'}
          inputProps={{ min: 0, step: 15 }}
        />

        <FormControl>
          <FormLabel>Qualifikation</FormLabel>
          <RadioGroup
            row
            aria-labelledby="demo-radio-buttons-group-label"
            value={qualification}
            onChange={(e) => {setQualification(e.target.value as Qualification)}}
          >
            <FormControlLabel value={Qualification.NO_QUALIFICATION} control={<Radio />} label="Ohne" />
            <FormControlLabel value={Qualification.WITH_QUALIFICATION} control={<Radio />} label="Mit" />
            <FormControlLabel value={Qualification.ANY} control={<Radio />} label="Egal" />
          </RadioGroup>
        </FormControl>

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
          handleConfirm({cents: parseInt(cents) * 100, description, qualification});
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
      title: "Pauschale löschen?",
      description: `Soll die Pauschalde "${deletionCandidate.description}" gelöscht werden?`
    })
      .then(
        () => handleDeleteCompensationValue(deletionCandidate)
      );
  }

  return <React.Fragment>
    <Card>
      <CardHeader title={'Standard-Pauschalen'} />
      <CardContent>
        <List style={{ maxHeight: 500, overflow: 'auto' }}>
          {values.map((v) => <CompensationValueListItem key={v.id} compensationValue={v} handleDeleteClick={handleDeleteClick}/>)}
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