'use client';
import React from 'react';

import { useSession } from 'next-auth/react';

import Grid from '@mui/material/Unstable_Grid2';

import { DisciplineDto } from 'janus-trainer-dto';

import { JanusSession } from '@/lib/auth';
import { Backend } from '@/lib/backend';
import LoginRequired from '@/components/LoginRequired';

import DisciplineList from './DisciplineList';

export default function Page() {
  const backend = React.useRef(new Backend());
  const [disciplines, setDisciplines] = React.useState<DisciplineDto[]>([]);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const handleAddDiscipline = React.useCallback(
    (name: string) => {
      if (!session?.accessToken) return;
      backend.current.addDiscipline(name);
    },
    [session?.accessToken],
  );

  React.useEffect(() => {
    backend.current.setAccessToken(session?.accessToken);
    if (!session?.accessToken) {
      return;
    }
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
    <>
      <Grid container spacing={2}>
        <Grid>
          <DisciplineList
            disciplines={disciplines}
            handleAddDiscipline={handleAddDiscipline}
          />
        </Grid>
      </Grid>
    </>
  );
}
