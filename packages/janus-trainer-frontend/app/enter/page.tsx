'use client';

import React, { useEffect } from 'react';

import TrainingTable from '../../components/TrainingTable';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '../../lib/auth';
import LoginRequired from '../../components/LoginRequired';
import { DisciplineDto, TrainingDto } from 'janus-trainer-dto';
import { getDisciplines } from '@/lib/api-disciplines';
import { getTrainingsForUser } from '@/lib/api-trainings';

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
  const [trainings, setTrainings] = React.useState<TrainingDto[]>([]);
  const [disciplines, setDisciplines] = React.useState<DisciplineDto[]>([]);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const refresh = React.useCallback(async () => {
    if (!session?.accessToken) return [];

    getDisciplines(session!.accessToken).then((v) =>
      setDisciplines(v.toSorted(sortDiscipline)),
    );

    return getTrainingsForUser(session.accessToken, session.userId).then(
      (v) => {
        // trainings need to be sorted
        v.sort((r1, r2) => parseInt(r1.id) - parseInt(r2.id));
        setTrainings(v);
        return v;
      },
    );
  }, [session, setTrainings, setDisciplines]);

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
