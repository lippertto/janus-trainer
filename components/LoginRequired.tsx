'use client';
import React from 'react';
import { Typography } from '@mui/material';
import { signIn } from 'next-auth/react';
import Stack from '@mui/system/Stack';
import Button from '@mui/material/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';

function PleaseLogIn() {
  return (
    <Stack alignItems={'center'}>
      <Typography>
        Melde dich mit einem Klick auf &quot;anmelden&quot; unten ein.
      </Typography>
      <Button onClick={() => signIn()} data-testid="login-button">
        Anmelden
      </Button>
    </Stack>
  );
}

export default function LoginRequired({
  authenticationStatus,
}: {
  authenticationStatus: 'authenticated' | 'loading' | 'unauthenticated';
}) {
  return (
    <>
      {authenticationStatus === 'loading' ? (
        <LoadingSpinner />
      ) : (
        <PleaseLogIn />
      )}
    </>
  );
}
