import React, { useCallback, useMemo, useState } from 'react';

import Grid from '@mui/material/Grid';
import { Typography } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import EditIcon from '@mui/icons-material/Edit';
import { groupToHumanReadable, ibanToHumanReadable } from '@/lib/formatters';
import { CourseCard } from '@/components/CourseCard';
import Button from '@mui/material/Button';
import { signOut } from 'next-auth/react';
import { CompensationClassDto, CourseDto, Group, UserDto } from '@/lib/dto';

import { termsOfServiceSuspenseQuery } from '@/lib/shared-queries';
import { TosDialog } from '@/components/TosDialog';
import Stack from '@mui/material/Stack';

function displayStringForGroups(groups: string[] | undefined) {
  // Beate Kubny reported an empty groups array.
  if (!groups?.length) {
    return 'Keine Gruppen';
  }
  return groups
    .map((g) => groupToHumanReadable(g as Group))
    .toSorted()
    .join(', ');
}

function formatCompensationClasses(
  compensationClasses: CompensationClassDto[] | undefined,
) {
  if (!compensationClasses?.length) {
    return 'keine';
  }
  return compensationClasses.map((cc) => cc.name).join(', ');
}

export default function Profile(props: {
  groups: string[];
  user: UserDto;
  courses: CourseDto[];
  handleEditIbanClick: () => void;
}) {
  const { user } = props;
  const [showTosDialog, setShowTosDialog] = useState(false);

  const { data: tosData } = termsOfServiceSuspenseQuery();

  const groupsDisplayString = useMemo(
    () => displayStringForGroups(props.groups),
    [props.groups],
  );

  const showAgbs = useCallback(() => setShowTosDialog(true), []);
  const hideAgbs = useCallback(() => setShowTosDialog(false), []);

  // sign out is not implemented in authjs.
  // https://github.com/nextauthjs/next-auth/issues/5862
  // to log out, we would have to go to the following url:
  // https://janus-trainer-dev.auth.eu-north-1.amazoncognito.com/logout?client_id=1efpqu750v8rhmmb8du7gss4k5&scope=openid&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fcognito
  const handleLogout = useCallback(() => {
    signOut().catch((e) => {
      console.error('Could not log out properly', e);
    });
  }, []);

  const formattedCompensationClass = useMemo(
    () => formatCompensationClasses(user.compensationClasses),
    [user.compensationClasses],
  );
  return (
    <>
      <Grid container spacing={2} sx={{ display: 'flex', pl: 2, pr: 2 }}>
        <Grid size={{ xs: 12 }}>
          <Typography variant={'h5'}>Stammdaten</Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField fullWidth disabled label="Name" value={user.name} />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField fullWidth disabled label="Email" value={user.email} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            disabled
            label="Gruppen"
            value={groupsDisplayString}
            slotProps={{
              htmlInput: {
                'data-testid': 'profile-groups-textfield',
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            disabled
            label="IBAN"
            value={
              user.iban
                ? ibanToHumanReadable(user.iban)
                : 'keine IBAN angegeben'
            }
            slotProps={{
              input: {
                endAdornment: (
                  <IconButton
                    aria-label="edit-iban"
                    onClick={props.handleEditIbanClick}
                  >
                    <EditIcon />
                  </IconButton>
                ),
              },
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            disabled
            label="Pauschalen-Gruppen"
            value={formattedCompensationClass}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Typography variant={'h5'}>Kurse</Typography>
        </Grid>
        {props.courses.length === 0 ? (
          <Grid size={{ xs: 12 }}>
            <Typography>Keine Kurse hinterlegt.</Typography>
          </Grid>
        ) : (
          props.courses.map((c) => (
            <Grid key={c.id}>
              <CourseCard course={c} />
            </Grid>
          ))
        )}

        <Grid size={{ xs: 12 }}>
          <Stack direction={'row'}>
            <Button onClick={showAgbs}>AGBs anzeigen</Button>
            <Button onClick={handleLogout}>Ausloggen</Button>
          </Stack>
        </Grid>
      </Grid>
      <TosDialog
        tosData={tosData}
        handleAccept={hideAgbs}
        open={showTosDialog}
        needsToAccept={false}
      />
    </>
  );
}
