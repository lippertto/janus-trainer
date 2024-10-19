import React from 'react';
import Typography from '@mui/material/Typography';
import { auth } from '@/lib/auth';
import LoginRequired from '../components/LoginRequired';
import { promises as fs } from 'fs';
import { JanusMarkdown } from '@/components/JanusMarkdown';
import Box from '@mui/system/Box';

async function Contents() {
  const changelog = await fs.readFile('./public/changelog.md', 'utf8');

  return (
    <React.Fragment>
      <Typography variant="h4">
        Willkommen in der Janus Abrechnungs-App
      </Typography>
      <Typography>
        Um in der App zu navigieren, klicke oben links auf Symbol mit den drei
        Strichen.
      </Typography>
      <Box paddingTop={5}>
        <JanusMarkdown children={changelog} />
      </Box>
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
