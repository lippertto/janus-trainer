import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import React from 'react';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { dateToHumanReadable } from '@/lib/formatters';

export default function DeleteTrainingDialog(props: {
  open: boolean;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  courseName: string;
  trainingDate: string;
}) {
  const [reason, setReason] = React.useState('');

  const handleConfirm = () => {
    props.onConfirm(reason);
    setReason('');
  };

  const handleClose = () => {
    setReason('');
    props.onClose();
  };

  return (
    <Dialog open={props.open} onClose={handleClose}>
      <DialogTitle>Training löschen</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Soll das Training "{props.courseName}" vom{' '}
          {dateToHumanReadable(props.trainingDate)} gelöscht werden?
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          label="Begründung"
          fullWidth
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Abbrechen</Button>
        <Button onClick={handleConfirm} disabled={!reason}>
          Löschen
        </Button>
      </DialogActions>
    </Dialog>
  );
}
