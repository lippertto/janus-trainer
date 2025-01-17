import React, { Suspense } from 'react';
import {
  CompensationClassDto,
  Group,
  UserCreateRequest,
  UserDto,
} from '@/lib/dto';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import FormLabel from '@mui/material/FormLabel';
import { Controller, useForm } from 'react-hook-form';
import Stack from '@mui/material/Stack';
import Autocomplete from '@mui/material/Autocomplete';
import { validateIBAN } from 'sepa';
import { ibanToHumanReadable } from '@/lib/formatters';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import ResendInvitationButton from '@/app/accounts/ResendInvitationButton';
import { JanusSession } from '@/lib/auth';

type FormData = {
  name: string;
  iban: string;
  email: string;
  isTrainer: boolean;
  isAdmin: boolean;
  compensationClasses: CompensationClassDto[];
};

function determineDefaultValues(toEdit: UserDto | null): FormData {
  let isTrainer = false;
  let isAdmin = false;
  if (toEdit) {
    if (toEdit.groups.indexOf(Group.TRAINERS) !== -1) {
      isTrainer = true;
    }
    if (toEdit.groups.indexOf(Group.ADMINS) !== -1) {
      isAdmin = true;
    }
  }
  return {
    name: toEdit?.name ?? '',
    email: toEdit?.email ?? '',
    isTrainer: isTrainer,
    isAdmin: isAdmin,
    compensationClasses: toEdit?.compensationClasses ?? [],
    iban: toEdit?.iban ?? '',
  };
}

export function UserDialog(props: {
  accessToken: string;
  toEdit: UserDto | null;
  compensationClasses: CompensationClassDto[];
  open: boolean;
  handleClose: () => void;
  handleSave: (data: UserCreateRequest) => void;
}) {
  const [previous, setPrevious] = React.useState<UserDto | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isValid },
  } = useForm<FormData>();

  React.useEffect(() => {
    if (props.toEdit !== previous) {
      reset(determineDefaultValues(props.toEdit));
      setPrevious(props.toEdit);
    }
  }, [props.toEdit]);

  const onSubmit = (data: FormData) => {
    if (isValid) {
      let groups = [];
      if (data.isTrainer) groups.push(Group.TRAINERS);
      if (data.isAdmin) groups.push(Group.ADMINS);
      let iban;
      if (data.iban && data.iban.length > 0) {
        iban = data.iban;
      }

      props.handleSave({
        name: data.name,
        email: data.email,
        iban: iban,
        groups: groups,
        compensationClassIds:
          data.compensationClasses?.map((cc) => cc.id) ?? [],
      });
      props.handleClose();
      reset();
    }
  };

  return (
    <Dialog open={props.open} onClose={props.handleClose}>
      <DialogTitle>Konto bearbeiten</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          <Stack direction={'column'} spacing={2}>
            <TextField
              label="Name"
              required={true}
              {...register('name')}
              error={!!errors.name?.message}
              helperText={errors.name?.message || ''}
              inputProps={{
                'data-testid': 'enter-name-textfield',
              }}
            />
            <TextField
              label="E-Mail"
              type="email"
              required={true}
              {...register('email', {
                setValueAs: (value: string) => value.trim(),
              })}
              error={!!errors.email?.message}
              helperText={errors.email?.message || ''}
              inputProps={{
                'data-testid': 'enter-email-textfield',
              }}
            />
            <Controller
              control={control}
              name="iban"
              rules={{
                validate: (v) => {
                  if (!v) return true;
                  if (validateIBAN(v)) return true;
                  return 'Das sieht nicht aus wie eine IBAN';
                },
              }}
              render={({ field: props }) => (
                <TextField
                  {...props}
                  value={ibanToHumanReadable(props.value ?? '')}
                  onChange={(e) =>
                    props.onChange(
                      e.target.value.replaceAll(' ', '').toUpperCase(),
                    )
                  }
                  label="IBAN"
                  error={Boolean(errors.iban)}
                  helperText={errors.iban?.message ?? ''}
                />
              )}
            />
            <FormGroup>
              <FormLabel id="compensation-label">Rollen</FormLabel>
              <FormControlLabel
                control={
                  <Controller
                    control={control}
                    name={'isTrainer'}
                    render={({ field: props }) => (
                      <Checkbox
                        {...props}
                        checked={props.value}
                        inputProps={
                          {
                            'data-testid': 'is-trainer-checkbox',
                          } as React.InputHTMLAttributes<HTMLInputElement>
                        }
                      />
                    )}
                  />
                }
                label="Übungsleitung"
              />
              <FormControlLabel
                control={
                  <Controller
                    control={control}
                    name={'isAdmin'}
                    render={({ field: props }) => (
                      <Checkbox
                        {...props}
                        checked={props.value}
                        inputProps={
                          {
                            'data-testid': 'is-admin-checkbox',
                          } as React.InputHTMLAttributes<HTMLInputElement>
                        }
                      />
                    )}
                  />
                }
                label="Admin"
              />
            </FormGroup>
            <Controller
              name="compensationClasses"
              control={control}
              render={({ field: { onChange, onBlur, value } }) => (
                <Autocomplete
                  renderInput={(params) => {
                    return (
                      <TextField {...params} label={'Pauschalen-Gruppen'} />
                    );
                  }}
                  options={props.compensationClasses}
                  getOptionLabel={(t) => t.name}
                  multiple={true}
                  onChange={(e, data) => onChange(data)}
                  onBlur={onBlur}
                  value={value}
                />
              )}
            />
            {props.toEdit ? (
              <Suspense fallback={<LoadingSpinner />}>
                <ResendInvitationButton
                  accessToken={props.accessToken}
                  userId={props.toEdit.id}
                  email={props.toEdit.email}
                />
              </Suspense>
            ) : null}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              props.handleClose();
              reset();
            }}
          >
            Abbrechen
          </Button>
          <Button type="submit" data-testid="save-user-button">
            Speichern
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
