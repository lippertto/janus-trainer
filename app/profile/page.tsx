'use client';

import { signOut, useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import React from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchSingleEntity } from '@/lib/fetch';
import { API_USERS } from '@/lib/routes';
import { CourseDto, UserDto } from '@/lib/dto';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { Paper, Typography } from '@mui/material';
import { coursesForTrainerSuspenseQuery } from '@/lib/shared-queries';
import { CourseCard } from '@/components/CourseCard';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import HelpIcon from '@mui/icons-material/Help';
import Grid from '@mui/material/Unstable_Grid2';


function ProfilePageContents({ session }: { session: JanusSession }) {
  const [showHelp, setShowHelp] = React.useState(false);

  const { data: user } = useSuspenseQuery({
    queryKey: ['users', session.userId],
    queryFn: () => fetchSingleEntity<UserDto>(API_USERS, session.userId, session.accessToken),
  });

  const { data: courses } = coursesForTrainerSuspenseQuery(
    session.userId,
    session.accessToken,
  );

  return <React.Fragment>
    <Grid container display={'flex'} spacing={2} sx={{ pl: 2, pr: 2 }}>
      <Grid xs={12}>
        {showHelp ?
          <Typography>
            Die Informationen auf dieser Seite werden vom Büro gepflegt und können von dir nicht verändert werden.
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
          InputProps={{
            readOnly: true,
          }}
          label="Name"
          value={user.name}
        />

      </Grid>
      <Grid>
        <TextField
          InputProps={{
            readOnly: true,
          }}
          label="Email"
          value={user.email}
        />
      </Grid>
      <Grid>
        <TextField
          InputProps={{
            readOnly: true,
          }}
          label="Gruppen"
          value={user.groups.join(', ')}
        />
      </Grid>
      <Grid>
        <TextField
          InputProps={{
            readOnly: true,
          }}
          label="IBAN"
          value={user.iban ?? 'keine IBAN angegeben'}
        />
      </Grid>
      <Grid xs={12}>
        <Typography variant={'h5'}>Kurse</Typography>
      </Grid>

      {
        courses.length === 0 ? <Grid xs={12}><Typography>Keine Kurse hinterlegt.</Typography></Grid> :
          courses.map((c) => (<Grid><CourseCard course={c} /></Grid>))
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