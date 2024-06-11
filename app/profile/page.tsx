'use client';

import { signOut, useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import React from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchSingleEntity } from '@/lib/fetch';
import { API_USERS } from '@/lib/routes';
import { UserDto } from '@/lib/dto';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import { Typography } from '@mui/material';

function ProfilePageContents({ session }: { session: JanusSession }) {
  const { data: user } = useSuspenseQuery({
    queryKey: ['users', session.userId],
    queryFn: () => fetchSingleEntity<UserDto>(API_USERS, session.userId, session.accessToken),
  });

  return <React.Fragment>
    <Stack spacing={2}>
      <TextField
        disabled={true}
        label="Name"
        value={user.name}
      />
      <TextField
        disabled={true}
        label="Email"
        value={user.email}
      />
      <TextField
        disabled={true}
        label="Gruppen"
        value={user.groups.join(', ')}
      />
      <TextField
        disabled={true}
        label="IBAN"
        value={user.iban ?? ''}
      />
      <Typography>
        Die Informationen auf dieser Seite werden vom Büro gepflegt und können von dir nicht verändert werden.
      </Typography>
      <Button
        onClick={() => {
          signOut()
            .catch((e) => {
              console.log('Could not log out properly', JSON.stringify(e));
            });
        }}
      >Ausloggen</Button>
    </Stack>
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