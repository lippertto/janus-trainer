import React from 'react';
import { Group, User } from '@/lib/dto';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import TextField from '@mui/material/TextField';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import FormLabel from '@mui/material/FormLabel';

export function EditUserDialog({
  user,
  open,
  handleClose,
  handleSave,
}: {
  user: User | null;
  open: boolean;
  handleClose: () => void;
  handleSave: (
    id: string | null,
    name: string,
    email: string,
    isTrainer: boolean,
    isAdmin: boolean,
    iban?: string,
  ) => void;
}) {
  const [previousUserId, setPreviousUserId] = React.useState<string>('');
  const [name, setName] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [iban, setIban] = React.useState<string>('');
  const [isTrainer, setIsTrainer] = React.useState<boolean>(false);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);

  if (previousUserId !== (user?.id ?? '')) {
    setName(user?.name ?? '');
    setEmail(user?.email ?? '');
    setIban(user?.iban ?? '');
    setIsTrainer(user ? user.groups.indexOf(Group.TRAINERS) !== -1 : false);
    setIsAdmin(user ? user.groups.indexOf(Group.ADMINS) !== -1 : false);
    setPreviousUserId(user?.id ?? '');
  }

  const nameIsSet = name && name?.length > 0;
  const emailIsSet = email && email?.length > 0;
  const ibanIsSet = iban?.length > 0;
  const dataIsValid = nameIsSet && emailIsSet && (!isTrainer || ibanIsSet);

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Nutzer bearbeiten</DialogTitle>
      <DialogContent>
        {/* We need a bit of space or the top will be cut off*/}
        <Grid container sx={{ pt: 2 }} spacing={2}>
          <Grid>
            <TextField
              label="Name"
              value={name ?? ''}
              onChange={(e) => setName(e.target.value)}
              error={nameIsSet ? false : true}
              helperText={nameIsSet ? null : 'Darf nicht leer sein'}
              inputProps={{
                'data-testid': 'enter-name-textfield',
              }}
            />
          </Grid>
          <Grid>
            <TextField
              label="E-Mail"
              value={email ?? ''}
              onChange={(e) => setEmail(e.target.value)}
              error={emailIsSet ? false : true}
              helperText={emailIsSet ? null : 'Darf nicht leer sein'}
              inputProps={{
                'data-testid': 'enter-email-textfield',
              }}
            />
          </Grid>
          <Grid>
            <FormGroup>
              <FormLabel id="compensation-label">Rollen</FormLabel>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isTrainer}
                    onChange={(e) => setIsTrainer(e.target.checked)}
                    inputProps={{ 'data-testid': 'is-trainer-checkbox' } as React.InputHTMLAttributes<HTMLInputElement>}
                  />
                }
                label="Übungsleitung"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isAdmin}
                    onChange={(e) => setIsAdmin(e.target.checked)}
                    inputProps={{ 'data-testid': 'is-admin-checkbox' } as React.InputHTMLAttributes<HTMLInputElement>}
                  />
                }
                label="Admin"
              />
            </FormGroup>
          </Grid>
          <Grid>
            <TextField
              label="IBAN"
              value={iban}
              onChange={(e) => setIban(e.target.value)}
              disabled={!isTrainer}
              error={isTrainer && !ibanIsSet}
              helperText={
                isTrainer && !ibanIsSet ? 'Notwendig für Übungsleitungen' : null
              }
              inputProps={{
                'data-testid': 'enter-iban-textfield',
              }}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setPreviousUserId('aborted');
            handleClose();
          }}
        >
          Abbrechen
        </Button>
        <Button
          disabled={!dataIsValid}
          onClick={() => {
            handleSave(
              user?.id ?? null,
              name,
              email,
              isTrainer,
              isAdmin,
              ibanIsSet ? iban : undefined,
            );
            setPreviousUserId('');
            handleClose();
          }}
          autoFocus
          data-testid={'save-user-button'}
        >
          Speichern
        </Button>
      </DialogActions>
    </Dialog>
  );
}
