'use client';
import React from 'react';

import { useSession } from 'next-auth/react';

import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import DisciplineCard from '@/app/offerings/cost-centers/DisciplineCard';
import Box from '@mui/material/Box';

function ConfigurationPageContents({ session }: { session: JanusSession }) {
  return (
    <Box maxWidth={400}>
      <DisciplineCard session={session} />
    </Box>
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
