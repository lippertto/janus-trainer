import Link from 'next/link';
import React from 'react';

import MenuIcon from '@mui/icons-material/Menu';
import Typography from '@mui/material/Typography';
import { auth } from '../lib/auth';
import LoginRequired from '../components/LoginRequired';

function Contents() {
  return (
    <Typography>
      Einen Menüpunkt unter <MenuIcon /> auswählen oder direkt{' '}
      <Link href={'/enter'}>eine neue Zeit eintragen</Link>
    </Typography>
  );
}

export default async function HomePage() {
  const session = await auth();

  return (
    <div>
      <Typography variant="h3">Janus Trainer-App 🚀</Typography>
      {session ? (
        <Contents />
      ) : (
        <LoginRequired authenticationStatus={'unauthenticated'} />
      )}
    </div>
  );
}
