import React from 'react';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import DeleteIcon from '@mui/icons-material/Delete';
import { Discipline } from '@prisma/client';
import { useConfirm } from 'material-ui-confirm';

function disciplineToListItem(
  d: Discipline,
  handleDeleteButtonClick: (d: Discipline) => void,
): React.ReactElement {
  return (
    <ListItem
      key={d.id}
      secondaryAction={
        <IconButton
          edge="end"
          onClick={() => {
            handleDeleteButtonClick(d);
          }}
          data-testid={`delete-discipline-${d.name}`}
        >
          <DeleteIcon />
        </IconButton>
      }
    >
      <ListItemText primary={d.name} />
    </ListItem>
  );
}

type AddDisciplineDialogueProps = {
  open: boolean;
  handleClose: () => void;
  newDisciplineName: string;
  setNewDisciplineName: React.Dispatch<React.SetStateAction<string>>;
  handleAddDiscipline: (name: string) => void;
  disciplines: Discipline[];
};

function AddDisciplineDialogue(
  {
    open,
    handleClose,
    newDisciplineName,
    setNewDisciplineName,
    disciplines,
    handleAddDiscipline,
  }: AddDisciplineDialogueProps) {
  const isDuplicateName = disciplines.find((d) => d.name === newDisciplineName);
  let errorMessage: string | null = null;
  if (newDisciplineName.length === 0) {
    errorMessage = 'Darf nicht leer sein';
  } else if (isDuplicateName) {
    errorMessage = 'Gibt es schon';
  }

  return (
    <Dialog open={open}>
      <DialogTitle>Sportart hinzufügen</DialogTitle>
      <DialogContent sx={{ height: 100 }}>
        <TextField
          label="Name der Sportart"
          value={newDisciplineName}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setNewDisciplineName(event.target.value);
          }}
          // needs to be set in Dialogs according to https://github.com/mui/material-ui/issues/29892#issuecomment-979745849
          margin="dense"
          inputProps={{
            'data-testid': 'enter-discipline-textfield',
          }}
          error={!!errorMessage}
          helperText={errorMessage}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Abbrechen</Button>
        <Button
          disabled={!!errorMessage}
          onClick={() => {
            handleAddDiscipline(newDisciplineName);
            setNewDisciplineName('');
            handleClose();
          }}
          data-testid="enter-discipline-confirm-button"
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type DisciplineListProps = {
  disciplines: Discipline[];
  handleAddDiscipline: (name: string) => void;
  deleteDiscipline: (discipline: Discipline) => void;
};

export default function DisciplineCard({
                                         disciplines,
                                         handleAddDiscipline,
                                         deleteDiscipline,
                                       }: DisciplineListProps) {
  const [showEnterDialog, setShowEnterDialog] = React.useState<boolean>(false);
    React.useState<boolean>(false);
  const [newDisciplineName, setNewDisciplineName] = React.useState<string>('');

  const confirm = useConfirm();
  const handleDeleteClick = (deletionCandidate: Discipline) => {
    confirm({
      title: "Sportart löschen?",
      description: `Soll die Vergütung "${deletionCandidate.name}" gelöscht werden?`
    })
      .then(
        () => deleteDiscipline(deletionCandidate)
      );
  }


  return (
    <>
      <Card>
        <CardHeader title={'Sportarten'} />
        <CardContent>
          <List style={{ maxHeight: 500, overflow: 'auto' }}>
            {disciplines.map((d) =>
              disciplineToListItem(d, handleDeleteClick),
            )}
          </List>
        </CardContent>
        <CardActions>
          <Button
            onClick={() => {
              setShowEnterDialog(true);
            }}
            data-testid="add-discipline-button"
          >
            Sportart hinzufügen
          </Button>
        </CardActions>
      </Card>
      <AddDisciplineDialogue
        open={showEnterDialog}
        handleClose={() => setShowEnterDialog(false)}
        newDisciplineName={newDisciplineName}
        setNewDisciplineName={setNewDisciplineName}
        disciplines={disciplines}
        handleAddDiscipline={handleAddDiscipline}
      />
    </>
  );
}
