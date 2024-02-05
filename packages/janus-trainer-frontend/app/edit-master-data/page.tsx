'use client';

import { useSession } from 'next-auth/react';

import Button from '@mui/material/Button';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2

import { DisciplineDto } from 'janus-trainer-dto';
import React from 'react';
import { ListItemText } from '@mui/material';
import { JanusSession } from '@/lib/auth';
import { Backend } from '@/lib/backend';
import LoginRequired from '@/components/LoginRequired';

function disciplineToListItem(d: DisciplineDto): React.ReactElement {
  return (
    <ListItem key={d.id}>
      <ListItemText primary={d.name} />
    </ListItem>
  );
}

export default function Page() {
  const backend = React.useRef(new Backend());
  const [disciplines, setDisciplines] = React.useState<DisciplineDto[]>([]);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  React.useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    backend.current.setAccessToken(session.accessToken);
    backend.current
      .getDisciplines()
      .then((d) =>
        d.toSorted((a, b) => {
          if (a.name < b.name) {
            return -1;
          }
          if (a.name > b.name) {
            return 1;
          }
          return 0;
        }),
      )
      .then((d) => {
        setDisciplines(d);
      });
  }, [session?.accessToken]);

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <Grid container spacing={2}>
      <Grid>
        <Button onClick={() => {}}>Disziplin hinzufügen</Button>
        <List style={{ maxHeight: 500, overflow: 'auto' }}>
          {disciplines.map(disciplineToListItem)}
        </List>
      </Grid>
    </Grid>
  );
}