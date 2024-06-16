import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { validateIBAN } from 'sepa';

export function EditIbanDialog(props: {
  open: boolean, handleClose: () => void,
  initialValue: string | null,
  handleConfirm: (v: string) => void,
}) {
  const [iban, setIban] = React.useState<string>(props.initialValue?.toUpperCase() ?? '');
  const ibanIsValid = validateIBAN(iban);
  return <Dialog open={props.open}>
    <DialogTitle>
      IBAN bearbeiten
    </DialogTitle>
    <DialogContent>
      <TextField
        autoFocus
        margin="dense"
        label="IBAN"
        type="text"
        fullWidth
        value={iban}
        onChange={(e) => setIban(e.target.value.toUpperCase())}
        error={!ibanIsValid}
        helperText={ibanIsValid ? ' ' : 'Keine valide IBAN'}
      />
    </DialogContent>
    <DialogActions>
      <Button
        onClick={() => {
          setTimeout(() => setIban(props.initialValue?.toUpperCase() ?? ''), 200);
          props.handleClose();
        }}>Abbrechen</Button>
      <Button
        disabled={!ibanIsValid}
        onClick={() => {
          props.handleClose();
          props.handleConfirm(iban);
        }}>Ok</Button>
    </DialogActions>
  </Dialog>;
}