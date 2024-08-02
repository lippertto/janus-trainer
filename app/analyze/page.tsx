"use client";

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import React from 'react';
import { yearlyTotalsSuspenseQuery } from '@/lib/shared-queries';
import YearlyTotalsTable from '@/app/analyze/YearlyTotalsTable';

function AnalyzePageContents(props: {accessToken: string}) {
  const {data: yearlySummaries} = yearlyTotalsSuspenseQuery(props.accessToken, 2024, null);

  return <YearlyTotalsTable totals={yearlySummaries} />
}

export default function AnalyzePage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <AnalyzePageContents
    accessToken={session.accessToken}
  />;
}