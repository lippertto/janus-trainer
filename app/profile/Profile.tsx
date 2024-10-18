import React, { Suspense, useState } from 'react';

import Grid from '@mui/material/Grid2';
import { CircularProgress, Typography } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import EditIcon from '@mui/icons-material/Edit';
import { groupToHumanReadable, ibanToHumanReadable } from '@/lib/formatters';
import { CourseCard } from '@/components/CourseCard';
import Button from '@mui/material/Button';
import { signOut } from 'next-auth/react';
import { CourseDto, UserDto } from '@/lib/dto';

import 'core-js/modules/es.array.to-sorted';
import { termsOfServiceSuspenseQuery } from '@/lib/shared-queries';
import { TosDialog } from '@/components/TosDialog';
import Stack from '@mui/material/Stack';

export default function Profile(props: {
  accessToken: string;
  user: UserDto;
  courses: CourseDto[];
  handleEditIbanClick: () => void;
}) {
  const { user } = props;
  const [showTosDialog, setShowTosDialog] = useState<boolean>(false);

  const { data: tosData } = termsOfServiceSuspenseQuery();

  // Beate Kubny reported an empty groups array.
  const groupsDisplayString = user.groups
    ? user.groups.map(groupToHumanReadable).toSorted().join(', ')
    : 'Keine Gruppen';

  return (
    <>
      <Grid container display={'flex'} spacing={2} sx={{ pl: 2, pr: 2 }}>
        <Grid size={{ xs: 12 }}>
          <Typography variant={'h5'}>Stammdaten</Typography>
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField fullWidth disabled={true} label="Name" value={user.name} />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            disabled={true}
            label="Email"
            value={user.email}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            fullWidth
            disabled={true}
            label="Gruppen"
            value={groupsDisplayString}
            inputProps={{
              'data-testid': 'profile-groups-textfield',
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth
            disabled={true}
            label="IBAN"
            value={
              user.iban
                ? ibanToHumanReadable(user.iban)
                : 'keine IBAN angegeben'
            }
            InputProps={{
              endAdornment: (
                <IconButton
                  onClick={() => {
                    props.handleEditIbanClick();
                  }}
                >
                  <EditIcon />
                </IconButton>
              ),
            }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField
            fullWidth={true}
            disabled={true}
            label="Pauschalen-Gruppen"
            value={
              user.compensationClasses!.length > 0
                ? user.compensationClasses!.map((cc) => cc.name).join(', ')
                : 'keine'
            }
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
            <Button onClick={() => setShowTosDialog(true)}>
              AGBs anzeigen
            </Button>
            <Button
              onClick={() => {
                // sign out is not implemented in authjs.
                // https://github.com/nextauthjs/next-auth/issues/5862
                // to log out, we would have to go to the following url:
                // https://janus-trainer-dev.auth.eu-north-1.amazoncognito.com/logout?client_id=1efpqu750v8rhmmb8du7gss4k5&scope=openid&response_type=code&redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fapi%2Fauth%2Fcallback%2Fcognito
                signOut().catch((e) => {
                  console.log('Could not log out properly', JSON.stringify(e));
                });
              }}
            >
              Ausloggen
            </Button>
          </Stack>
        </Grid>
      </Grid>
      <TosDialog
        tosData={tosData}
        handleAccept={() => setShowTosDialog(false)}
        open={showTosDialog}
        needsToAccept={false}
      />
    </>
  );
}
