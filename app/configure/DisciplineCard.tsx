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
import { Typography } from '@mui/material';
import { Discipline } from '@prisma/client';

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
  newDiscipineName: string;
  setNewDisciplineName: React.Dispatch<React.SetStateAction<string>>;
  handleAddDiscipline: (name: string) => void;
  disciplines: Discipline[];
};

function AddDisciplineDialogue({
  open,
  handleClose,
  newDiscipineName,
  setNewDisciplineName,
  disciplines,
  handleAddDiscipline,
}: AddDisciplineDialogueProps) {
  const isDuplicateName = disciplines.find((d) => d.name === newDiscipineName);
  let errorMessage: string | null = null;
  if (newDiscipineName.length === 0) {
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
          value={newDiscipineName}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setNewDisciplineName(event.target.value);
          }}
          // needs to be set in Dialogs according to https://github.com/mui/material-ui/issues/29892#issuecomment-979745849
          margin="dense"
          error={!!errorMessage}
          helperText={errorMessage}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Abbrechen</Button>
        <Button
          disabled={!!errorMessage}
          onClick={() => {
            handleAddDiscipline(newDiscipineName);
            setNewDisciplineName('');
            handleClose();
          }}
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type DeleteDisciplineDialogProps = {
  open: boolean;
  handleClose: () => void;
  discipline: Discipline | null;
  handleConfirmDeletion: () => void;
};

function DeleteDisciplineDialog({
  open,
  handleClose,
  discipline,
  handleConfirmDeletion,
}: DeleteDisciplineDialogProps) {
  return (
    <Dialog open={open}>
      <DialogTitle>Sportart löschen</DialogTitle>
      <DialogContent>
        <Typography>Sportart {discipline?.name} löschen?</Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Abbrechen</Button>
        <Button
          color="error"
          onClick={() => {
            handleConfirmDeletion();
            handleClose();
          }}
        >
          Löschen
        </Button>
      </DialogActions>
    </Dialog>
  );
}

type DisciplineListProps = {
  disciplines: Discipline[];
  handleAddDiscipline: (name: string) => void;
  deleteDiscipline: (id: number) => void;
};

export default function DisciplineList({
  disciplines,
  handleAddDiscipline,
  deleteDiscipline,
}: DisciplineListProps) {
  const [showEnterDialog, setShowEnterDialog] = React.useState<boolean>(false);
  const [showDeleteDialog, setShowDeleteDialog] =
    React.useState<boolean>(false);
  const [newDiscipineName, setNewDisciplineName] = React.useState<string>('');
  const [activeDiscipline, setActiveDiscipline] =
    React.useState<Discipline | null>(null);

  const handleDeleteButtonClick = React.useCallback(
    (discipline: Discipline) => {
      setActiveDiscipline(discipline);
      setShowDeleteDialog(true);
    },
    [setActiveDiscipline, setShowDeleteDialog],
  );

  return (
    <>
      <Card>
        <CardHeader title={'Sportarten'} />
        <CardContent>
          <List style={{ maxHeight: 500, overflow: 'auto' }}>
            {disciplines.map((d) =>
              disciplineToListItem(d, handleDeleteButtonClick),
            )}
          </List>
        </CardContent>
        <CardActions>
          <Button
            onClick={() => {
              setShowEnterDialog(true);
            }}
          >
            Sportart hinzufügen
          </Button>
        </CardActions>
      </Card>
      <AddDisciplineDialogue
        open={showEnterDialog}
        handleClose={() => setShowEnterDialog(false)}
        newDiscipineName={newDiscipineName}
        setNewDisciplineName={setNewDisciplineName}
        disciplines={disciplines}
        handleAddDiscipline={handleAddDiscipline}
      />
      <DeleteDisciplineDialog
        open={showDeleteDialog}
        handleClose={() => {
          setShowDeleteDialog(false);
          setActiveDiscipline(null);
        }}
        discipline={activeDiscipline}
        handleConfirmDeletion={() => {
          deleteDiscipline(activeDiscipline!.id);
        }}
      />
    </>
  );
}
