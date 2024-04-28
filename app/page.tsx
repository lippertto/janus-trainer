import React from 'react';

import MenuIcon from '@mui/icons-material/Menu';
import Typography from '@mui/material/Typography';
import { auth } from '../lib/auth';
import LoginRequired from '../components/LoginRequired';

function Contents() {
  return (
    <React.Fragment>
      <Typography component="p">
        Willkommen in der Janus Trainerstunden App.
      </Typography>
      <Typography component="p" sx={{ display: 'flex', alignItems: 'top' }}>
        Um in der App zu navigieren, klicke oben links auf das &nbsp;{' '}
        <MenuIcon /> &nbsp; Zeichen
      </Typography>
    </React.Fragment>
  );
}

export default async function HomePage() {
  const session = await auth();

  return (
    <div>
      {session ? (
        <Contents />
      ) : (
        <LoginRequired authenticationStatus={'unauthenticated'} />
      )}
    </div>
  );
}
