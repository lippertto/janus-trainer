import { Typography } from '@mui/material';
import React from 'react';

function PleaseLogIn() {
  return (
    <Typography>
      Du bist nicht eingeloggt. Log dich ein, indem du rechts oben auf das
      Avatar-Symbol klickst.
    </Typography>
  );
}

function Loading() {
  return <Typography>Prüfe Login-Daten</Typography>;
}

export default function LoginRequired({
  authenticationStatus,
}: {
  authenticationStatus: 'authenticated' | 'loading' | 'unauthenticated';
}) {
  return (
    <>{authenticationStatus === 'loading' ? <Loading /> : <PleaseLogIn />}</>
  );
}
