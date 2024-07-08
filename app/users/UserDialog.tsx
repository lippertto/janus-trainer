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
import { CompensationGroup } from '@prisma/client';
import FormControl from '@mui/material/FormControl';

type CompensationGroupState = {
  withQualification: boolean;
  noQualification: boolean;
  league: boolean;
}

const NO_COMPENSATION_GROUPS = {
  withQualification: false,
  noQualification: false,
  league: false,
};

function compensationGroupStateToCompensationGroups(state: CompensationGroupState): CompensationGroup[] {
  let result: CompensationGroup[] = [];
  if (state.league) {
    result.push(CompensationGroup.LEAGUE);
  }
  if (state.withQualification) {
    result.push(CompensationGroup.WITH_QUALIFICATION);
  }
  if (state.noQualification) {
    result.push(CompensationGroup.NO_QUALIFICATION);
  }
  return result;
}

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
    data: UserCreateRequest,
  ) => void;
}) {
  const [previousUser, setPreviousUser] = React.useState<UserDto | null>(null);
  const [name, setName] = React.useState<string>('');
  const [email, setEmail] = React.useState<string>('');
  const [iban, setIban] = React.useState<string>('');
  const [isTrainer, setIsTrainer] = React.useState<boolean>(false);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(false);
  const [compensationGroups, setCompensationGroups] = React.useState<CompensationGroupState>({ ...NO_COMPENSATION_GROUPS });

  const resetFields = React.useCallback(() => {
    setName('');
    setEmail('');
    setIban('');
    setIsTrainer(false);
    setIsAdmin(false);
    setCompensationGroups({ ...NO_COMPENSATION_GROUPS });
    }, [setName, setEmail, setIban, setIsTrainer, setIsAdmin, setCompensationGroups]
  )

  if (previousUser !== userToEdit) {
    setPreviousUser(userToEdit);
    if (userToEdit) {
      setName(userToEdit.name);
      setEmail(userToEdit.email);
      setIban(userToEdit.iban ?? '');
      setIsTrainer(userToEdit.groups.indexOf(Group.TRAINERS) !== -1);
      setIsAdmin(userToEdit.groups.indexOf(Group.ADMINS) !== -1);
      setCompensationGroups({
        noQualification: userToEdit.compensationGroups.indexOf(CompensationGroup.NO_QUALIFICATION) !== -1,
        withQualification: userToEdit.compensationGroups.indexOf(CompensationGroup.WITH_QUALIFICATION) !== -1,
        league: userToEdit.compensationGroups.indexOf(CompensationGroup.LEAGUE) !== -1,
      });
    } else {
      resetFields();
    }
  }

  const { noQualification, withQualification, league } = compensationGroups;

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setCompensationGroups({
      ...compensationGroups,
      [event.target.name]: event.target.checked,
    });
  };


  const nameIsSet = name && name?.length > 0;
  const emailIsSet = email && email?.length > 0;
  const ibanIsSet = iban?.length > 0;
  const dataIsValid = nameIsSet && emailIsSet && (!isTrainer || ibanIsSet);

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Konto bearbeiten</DialogTitle>
      <DialogContent>
        {/* We need a bit of space or the top will be cut off*/}
        <Grid container sx={{ pt: 2 }} spacing={2}>
          <Grid>
            <TextField
              label="Name"
              value={name ?? ''}
              onChange={(e) => setName(e.target.value)}
              error={!nameIsSet}
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
              error={!emailIsSet}
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
          <Grid>
            <FormControl disabled={!isTrainer}>
              <FormLabel>Pauschalen-Gruppen</FormLabel>
              <FormGroup>
                <FormControlLabel
                  control={<Checkbox onChange={handleChange} checked={noQualification} name="noQualification" />}
                  label="Keine Quali" />
                <FormControlLabel
                  control={<Checkbox onChange={handleChange} checked={withQualification} name="withQualification" />}
                  label="Mit Quali" />
                <FormControlLabel control={<Checkbox onChange={handleChange} checked={league} />} label="Liga-Spiel"
                                  name="league" />
              </FormGroup>
            </FormControl>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            setTimeout(resetFields, 300);
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
                iban: ibanIsSet ? iban : undefined,
                groups,
                compensationGroups: compensationGroupStateToCompensationGroups(compensationGroups),
              },
            );
            setTimeout(resetFields, 300);
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
