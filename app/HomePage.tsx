import React from 'react';
import Typography from '@mui/material/Typography';
import { promises as fs } from 'fs';
import { JanusMarkdown } from '@/components/JanusMarkdown';
import Box from '@mui/system/Box';
import { Group } from '@/lib/dto';
import { selectOneUser } from '@/app/api/users/[userId]/select-one-user';

async function IbanWarning(props: { userId: string }) {
  const userInfo = await selectOneUser(props.userId, true, false, false);
  let showWarning = true;
  if (userInfo.groups.indexOf(Group.TRAINERS) === -1) {
    showWarning = false;
  }
  if (userInfo.iban) {
    showWarning = false;
  }

  return (
    <Typography
      color="error"
      style={{ display: showWarning ? 'block' : 'none' }}
    >
      Bitte die IBAN im Profil eintragen.
    </Typography>
  );
}

export async function HomePage(props: { userId: string }) {
  const changelog = await fs.readFile('./public/changelog.md', 'utf8');

  const ibanWarning = await IbanWarning({ userId: props.userId });

  return (
    <React.Fragment>
      <Typography variant="h4">
        Willkommen in der Janus Abrechnungs-App
      </Typography>
      <Typography>
        Um in der App zu navigieren, klicke oben links auf Symbol mit den drei
        Strichen.
      </Typography>
      {ibanWarning}
      <Box paddingTop={5}>
        <JanusMarkdown children={changelog} />
      </Box>
    </React.Fragment>
  );
}
