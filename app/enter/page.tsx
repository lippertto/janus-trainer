'use client';

import React, { useEffect } from 'react';

import TrainingTable from '../../components/TrainingTable';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '../../lib/auth';
import LoginRequired from '../../components/LoginRequired';
import { getDisciplines } from '@/lib/api-disciplines';
import { getTrainingsForUser } from '@/lib/api-trainings';
import { getHolidays } from '@/lib/api-holidays';
import { showError } from '@/lib/notifications';
import { CompensationValue, Discipline, Holiday } from '@prisma/client';
import { TrainingDtoNew } from '@/lib/dto';
import { getCompensationValues } from '@/lib/api-compensation-values';

function sortDiscipline(a: Discipline, b: Discipline): number {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

export default function EnterPage() {
  const [trainings, setTrainings] = React.useState<TrainingDtoNew[]>([]);
  const [disciplines, setDisciplines] = React.useState<Discipline[]>([]);
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
  const [compensationValues, setCompensationValues] = React.useState<CompensationValue[]>([]);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const refresh = React.useCallback(async () => {
    if (!session?.accessToken) return [];
    let promises = [];

    promises.push(getDisciplines(session!.accessToken)
      .then((v) => setDisciplines(v.toSorted(sortDiscipline)))
      .catch((e) => {
        showError('Konnte die Sportarten nicht laden', e.message);
      }));

    // we get the holidays for this year and the last. This should be enough
    promises.push(getHolidays(session.accessToken, [
      new Date().getFullYear(),
      new Date().getFullYear() - 1,
    ])
      .then((v) => {
        setHolidays(v);
      })
      .catch((e) => {
        showError('Konnte die Feiertage nicht laden', e.message);
      }));

    promises.push(getTrainingsForUser(session.accessToken, session.userId).then(
      (v) => {
        // trainings need to be sorted
        v.sort((r1, r2) => r1.id - r2.id);
        setTrainings(v);
      },
    ));

    promises.push(getCompensationValues(session.accessToken)
      .then((v) => setCompensationValues(v))
      .catch((e: Error) => {
        showError('Konnte Vergütungen nicht laden.', e.message);
      }));

    return Promise.all(promises);
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
      holidays={holidays}
      setTrainings={setTrainings}
      refresh={refresh}
      approvalMode={false}
      compensationValues={compensationValues}
      data-testid="enter-training-table"
    />
  );
}
