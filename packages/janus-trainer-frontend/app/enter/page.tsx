'use client';

import React, { useEffect, useRef } from 'react';

import { Backend, Training } from '../../lib/backend';
import TrainingTable from '../../components/TrainingTable';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '../../lib/auth';
import LoginRequired from '../../components/LoginRequired';
import { DisciplineDto } from 'janus-trainer-dto';

function sortDiscipline(a: DisciplineDto, b: DisciplineDto): number {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

export default function EnterPage() {
  const backend = useRef<Backend>(new Backend());

  const [trainings, setTrainings] = React.useState<Training[]>([]);
  const [disciplines, setDisciplines] = React.useState<DisciplineDto[]>([]);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const refresh = React.useCallback(async () => {
    if (authenticationStatus !== 'authenticated') {
      return Promise.resolve([]);
    }

    backend.current.setAccessToken(session?.accessToken);
    backend.current
      .getDisciplines()
      .then((v) => setDisciplines(v.toSorted(sortDiscipline)));

    return backend.current.getTrainingsForUser(session?.userId).then((v) => {
      // trainings need to be sorted
      v.sort((r1, r2) => parseInt(r1.id) - parseInt(r2.id));
      setTrainings(v);
      return v;
    });
  }, [session, setTrainings, setDisciplines, authenticationStatus]);

  useEffect(() => {
    refresh();
  }, [session?.accessToken, refresh]);

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <TrainingTable
      trainings={trainings}
      disciplines={disciplines}
      setTrainings={setTrainings}
      refresh={refresh}
      approvalMode={false}
    />
  );
}
