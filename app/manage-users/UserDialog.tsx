import React from 'react';
import { Group, UserCreateRequest, UserDto } from '@/lib/dto';
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

export function UserDialog({
  userToEdit,
  open,
  handleClose,
  handleSave,
}: {
  userToEdit: UserDto | null;
  open: boolean;
  handleClose: () => void;
  handleSave: (
    data: UserCreateRequest
  ) => void;
}) {
  const [previousUser, setPreviousUser] = React.useState<UserDto|null>(null);
  const [name, setName] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [iban, setIban] = React.useState<string>('');
  const [isTrainer, setIsTrainer] = React.useState<boolean>(false);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);

  if (previousUser !== userToEdit) {
    setPreviousUser(userToEdit);
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setIban(userToEdit.iban ?? "");
      setIsTrainer(userToEdit.groups.indexOf(Group.TRAINERS) !== -1);
      setIsAdmin(userToEdit.groups.indexOf(Group.ADMINS) !== -1);
    }
    else {
      setName('');
      setEmail('');
      setIban('');
      setIsTrainer(false);
      setIsAdmin(false);
    }
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
            handleClose();
          }}
        >
          Abbrechen
        </Button>
        <Button
          disabled={!dataIsValid}
          onClick={() => {
            let groups = [];
            if (isTrainer) groups.push(Group.TRAINERS);
            if (isAdmin) groups.push(Group.ADMINS);
            handleSave(
              {
                name,
                email,
                iban: ibanIsSet? iban: undefined,
                groups
              }
            );
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
