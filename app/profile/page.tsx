'use client';

import { signOut, useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import React from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { Typography } from '@mui/material';
import { coursesForTrainerSuspenseQuery, userSuspenseQuery } from '@/lib/shared-queries';
import { CourseCard } from '@/components/CourseCard';
import IconButton from '@mui/material/IconButton';
import HelpIcon from '@mui/icons-material/Help';
import Grid from '@mui/material/Unstable_Grid2';
import { compensationGroupToHumanReadable, groupToHumanReadable } from '@/lib/formatters';
import EditIcon from '@mui/icons-material/Edit';
import { EditIbanDialog } from '@/app/profile/EditIbanDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserDto } from '@/lib/dto';
import { patchInApi } from '@/lib/fetch';
import { API_USERS } from '@/lib/routes';
import { showError, showSuccess } from '@/lib/notifications';

function ProfilePageContents({ session }: { session: JanusSession }) {
  const queryClient = useQueryClient();
  const [showHelp, setShowHelp] = React.useState(false);
  const [showIbanDialog, setShowIbanDialog] = React.useState(false);
  const { data: user } = userSuspenseQuery(session.userId, session.accessToken);

  const { data: courses } = coursesForTrainerSuspenseQuery(
    session.userId,
    session.accessToken,
  );

  const updateIbanMutation = useMutation({
    mutationFn: (iban: string) => patchInApi<UserDto>(API_USERS, session.userId, { iban }, session.accessToken),
    onSuccess: (data) => {
      showSuccess(`Iban aktualisiert`);
      queryClient.invalidateQueries({ queryKey: [API_USERS, session.userId] });
    },
    onError: (e) => {
      showError('Konnte IBAN nicht aktualisieren', e.message);
    },
  });

  return <React.Fragment>
    <Grid container display={'flex'} spacing={2} sx={{ pl: 2, pr: 2 }}>
      <Grid xs={12}>
        {showHelp ?
          <Typography>
            Die meisten Informationen auf dieser Seite werden vom Büro gepflegt und können von dir nicht verändert
            werden.
          </Typography>
          : null}
      </Grid>

      <Grid xs={11}>
        <Typography variant={'h5'}>Stammdaten</Typography>
      </Grid>
      <Grid xs={1}>
        <IconButton aria-label={'Hilfe'} onClick={() => setShowHelp(!showHelp)}>
          <HelpIcon />
        </IconButton>
      </Grid>

      <Grid>
        <TextField
          disabled={true}
          label="Name"
          value={user.name}
        />

      </Grid>
      <Grid>
        <TextField
          disabled={true}
          label="Email"
          value={user.email}
        />
      </Grid>
      <Grid xs={2}>
        <TextField
          fullWidth
          disabled={true}
          label="Gruppen"
          value={user.groups.toSorted().map(groupToHumanReadable).join(', ')}
        />
      </Grid>
      <Grid xs={2}>
        <TextField
          fullWidth
          disabled={true}
          label="IBAN"
          value={user.iban ?? 'keine IBAN angegeben'}
          InputProps={{
            endAdornment: <IconButton onClick={() => {
              setShowIbanDialog(true);
            }}><EditIcon /></IconButton>,
          }}
        />
      </Grid>
      <Grid>
        <TextField
          disabled={true}
          label="Pauschalen-Gruppen"
          value={
            user.compensationGroups.length > 1 ?
              user.compensationGroups.map(compensationGroupToHumanReadable).join(', ') :
              'keine'
          }
        />
      </Grid>

      <Grid xs={12}>
        <Typography variant={'h5'}>Kurse</Typography>
      </Grid>
      {
        courses.length === 0 ? <Grid xs={12}><Typography>Keine Kurse hinterlegt.</Typography></Grid> :
          courses.map((c) => (<Grid key={c.id}><CourseCard course={c} /></Grid>))
      }
      <Grid xs={12}>
        <Button
          onClick={() => {
            signOut()
              .catch((e) => {
                console.log('Could not log out properly', JSON.stringify(e));
              });
          }}
        >Ausloggen</Button>
      </Grid>
    </Grid>
    <EditIbanDialog
      open={showIbanDialog}
      handleClose={() => {
        setShowIbanDialog(false);
      }}
      handleConfirm={updateIbanMutation.mutate}
      initialValue={user.iban}
    />
  </React.Fragment>;
}

export default function ProfilePage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }
  if (!session) {
    return <LoadingSpinner />;
  }

  return <ProfilePageContents session={session} />;
}