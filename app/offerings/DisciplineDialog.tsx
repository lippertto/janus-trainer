import React from 'react';
import { Discipline } from '@prisma/client';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

type DisciplineDialogueProps = {
  open: boolean;
  handleClose: () => void;
  handleSave: (data: { name: string }) => void;
  disciplines: Discipline[];
  disciplineToEdit: Discipline|null;
};

export function DisciplineDialogue(
  {
    open,
    handleClose,
    disciplines,
    handleSave,
    disciplineToEdit
  }: DisciplineDialogueProps) {
  const [disciplineName, setDisciplineName] = React.useState('');

  const [previousDiscipline, setPreviousDiscipline] = React.useState<Discipline|null>(null);

  if (previousDiscipline !== disciplineToEdit) {
    setPreviousDiscipline(disciplineToEdit);
    if (disciplineToEdit) {
      setDisciplineName(disciplineToEdit.name);
    } else {
      setDisciplineName('');
    }
  }

  const isDuplicateName = disciplines.find((d) => d.name === disciplineName);
  let errorMessage = "";
  if (disciplineName.length === 0) {
    errorMessage = 'Darf nicht leer sein';
  } else if (isDuplicateName) {
    errorMessage = 'Gibt es schon';
  }

  return (
    <Dialog open={open}>
      <DialogTitle>{disciplineToEdit ? "Sportart bearbeiten" : "Sportart erstellen"}</DialogTitle>
      <DialogContent sx={{ height: 100 }}>
        <TextField
          label="Name der Sportart"
          value={disciplineName}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
            setDisciplineName(event.target.value);
          }}
          // needs to be set in Dialogs according to https://github.com/mui/material-ui/issues/29892#issuecomment-979745849
          margin="dense"
          inputProps={{
            'data-testid': 'enter-discipline-textfield',
          }}
          error={errorMessage !== ""}
          helperText={errorMessage}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => {
          handleClose();
          if (!previousDiscipline) {
            setTimeout(() => setDisciplineName(''), 300);
          }
        }}>Abbrechen</Button>
        <Button
          disabled={!!errorMessage}
          onClick={() => {
            handleClose();
            handleSave({name: disciplineName});
            if (!previousDiscipline) {
              setTimeout(() => setDisciplineName(''), 300);
            }
          }}
          data-testid="enter-discipline-confirm-button"
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}
