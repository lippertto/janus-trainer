import React from 'react';
import Typography from '@mui/material/Typography';
import { promises as fs } from 'fs';
import { Group } from '@/lib/dto';
import { selectOneUser } from '@/app/api/users/[userId]/select-one-user';
import Grid from '@mui/material/Grid';

import Stack from '@mui/system/Stack';
import { Instructions } from '@/app/Instructions';

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
  const ibanWarning = await IbanWarning({ userId: props.userId });

  return (
    <React.Fragment>
      <Stack>
        {ibanWarning ?? null}

        <Instructions />
      </Stack>
    </React.Fragment>
  );
}
