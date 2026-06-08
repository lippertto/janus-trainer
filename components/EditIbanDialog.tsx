import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import TextField from '@mui/material/TextField';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { validateIBAN } from 'sepa';
import { ibanToHumanReadable } from '@/lib/formatters';

export function EditIbanDialog(props: {
  open: boolean;
  handleClose: () => void;
  initialValue: string | null;
  handleConfirm: (v: string) => void;
}) {
  const [iban, setIban] = React.useState<string>('');

  React.useEffect(() => {
    if (props.open) {
      setIban(props.initialValue?.toUpperCase() ?? '');
    }
  }, [props.open, props.initialValue]);

  const ibanIsValid = validateIBAN(iban);
  return (
    <Dialog open={props.open} onClose={props.handleClose}>
      <DialogTitle>IBAN bearbeiten</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          sx={{ width: 300 }}
          margin="dense"
          label="IBAN"
          type="text"
          fullWidth
          value={ibanToHumanReadable(iban)}
          onChange={(e) =>
            setIban(e.target.value.replaceAll(' ', '').toUpperCase())
          }
          error={!ibanIsValid}
          helperText={ibanIsValid ? ' ' : 'Keine valide IBAN'}
        />
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            props.handleClose();
          }}
        >
          Abbrechen
        </Button>
        <Button
          disabled={!ibanIsValid}
          onClick={() => {
            props.handleClose();
            props.handleConfirm(iban);
          }}
        >
          Ok
        </Button>
      </DialogActions>
    </Dialog>
  );
}
