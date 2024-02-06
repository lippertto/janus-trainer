import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import React from 'react';
import { Training } from '../lib/backend';
import dayjs from 'dayjs';

interface DeleteTrainingDialog {
  open: boolean;
  onClose: (ok: boolean) => void;
  training: Training | null;
}

export default function DeleteTrainingDialog(props: DeleteTrainingDialog) {
  const { open, onClose, training } = props;

  const dateString = training?.date
    ? dayjs(training.date).format('DD.MM.YYYY')
    : 'TRAININGS_DATUM';

  return (
    <Dialog open={open}>
      <DialogTitle>Löschen bestätigen</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Soll das {training?.discipline.name}-Training von{' '}
          {training?.user.name} am {dateString} gelöscht werden?
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Abbrechen</Button>
        <Button onClick={() => onClose(true)} autoFocus>
          Löschen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
