import React from 'react';

import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';

import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { DisciplineDto } from 'janus-trainer-dto';

import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

function disciplineToListItem(d: DisciplineDto): React.ReactElement {
  return (
    <ListItem key={d.id}>
      <ListItemText primary={d.name} />
    </ListItem>
  );
}

type DisciplineListProps = {
  disciplines: DisciplineDto[];
  handleAddDiscipline: (name: string) => void;
};

export default function DisciplineList({
  disciplines,
  handleAddDiscipline,
}: DisciplineListProps) {
  const [showEnterDialog, setShowEnterDialog] = React.useState<boolean>(false);
  const [newDiscipineName, setNewDisciplineName] = React.useState<string>('');

  const isDuplicateName = disciplines.find((d) => d.name === newDiscipineName);

  const newDisplayNameIsValid = newDiscipineName.length > 0 && !isDuplicateName;
  let errorMessage: string | null = null;
  if (newDiscipineName.length === 0) {
    errorMessage = 'Darf nicht leer sein';
  } else if (isDuplicateName) {
    errorMessage = 'Gibt es schon';
  }

  return (
    <>
      <Card>
        <CardHeader title={'Sportarten'} />
        <CardContent>
          <List style={{ maxHeight: 500, overflow: 'auto' }}>
            {disciplines.map(disciplineToListItem)}
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
      <Dialog open={showEnterDialog}>
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
          <Button onClick={() => setShowEnterDialog(false)}>Abbrechen</Button>
          <Button
            disabled={!newDisplayNameIsValid}
            onClick={() => {
              handleAddDiscipline(newDiscipineName);
              setNewDisciplineName('');
              setShowEnterDialog(false);
            }}
          >
            Speichern
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
