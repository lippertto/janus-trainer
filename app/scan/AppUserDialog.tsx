import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';

import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import { AppUser } from '@/lib/dto';

type AppUserDialogProps = {
  profile: AppUser | null;
  open: boolean;
  handleConfirm: (profile: AppUser) => void;
  handleClose: () => void;
};

export default function AppUserDialog({
  profile,
  open,
  handleConfirm,
  handleClose,
}: AppUserDialogProps) {
  return (
    <>
      <Dialog open={open} sx={{ padding: 3 }}>
        <DialogTitle>Mitglied gefunden</DialogTitle>
        <DialogContent>
          <Box sx={{ m: 1 }} />

          <Stack spacing={2}>
            <TextField
              label="Vorname"
              value={profile?.firstname ?? ''}
              InputProps={{
                readOnly: true,
              }}
            />
            <TextField
              label="Nachname"
              value={profile?.name ?? ''}
              InputProps={{
                readOnly: true,
              }}
            />
            <TextField
              label="Mitgliedsnummer"
              value={profile?.membershipNumber ?? ''}
              InputProps={{
                readOnly: true,
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              handleConfirm(profile!);
              handleClose();
            }}
          >
            Ok
          </Button>
          <Button onClick={handleClose}>Abbrechen</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
