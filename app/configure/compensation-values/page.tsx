'use client';
import React from 'react';

import { useSession } from 'next-auth/react';

import Grid from '@mui/material/Unstable_Grid2';

import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';

import CompensationCard from '@/app/configure/compensation-values/CompensationCard';

function ConfigurationPageContents({ session }: { session: JanusSession }) {

  return (
          <CompensationCard session={session} />
  );
}

export default function ConfigurationPage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <ConfigurationPageContents session={session} />;
}