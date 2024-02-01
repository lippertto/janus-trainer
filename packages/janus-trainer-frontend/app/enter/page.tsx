'use client';

import React, { useEffect, useRef } from 'react';

import { Backend, Training } from '../../lib/backend';
import TrainingTable from '../../components/TrainingTable';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '../../lib/auth';
import LoginRequired from '../../components/LoginRequired';

export default function EnterPage() {
  const backend = useRef<Backend>(new Backend());

  const [trainings, setTrainings] = React.useState<Training[]>([]);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const refresh = React.useCallback(async () => {
    if (authenticationStatus !== 'authenticated') {
      return Promise.resolve([]);
    }

    backend.current.setAccessToken(session?.accessToken);

    return backend.current.getTrainingsForUser(session?.userId).then((v) => {
      // trainings need to be sorted
      v.sort((r1, r2) => parseInt(r1.id) - parseInt(r2.id));
      setTrainings(v);
      return v;
    });
  }, [session, setTrainings, authenticationStatus]);

  useEffect(() => {
    refresh();
  }, [session?.accessToken, refresh]);

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <TrainingTable
      trainings={trainings}
      setTrainings={setTrainings}
      refresh={refresh}
      approvalMode={false}
    />
  );
}
