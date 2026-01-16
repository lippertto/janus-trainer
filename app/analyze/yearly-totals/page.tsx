'use client';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import React, { useState } from 'react';
import {
  getMaxCentsPerYearQuery,
  trainingStatisticsSuspenseQuery,
} from '@/lib/shared-queries';
import YearlyTotalsTable from '@/app/analyze/yearly-totals/YearlyTotalsTable';
import Stack from '@mui/material/Stack';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';

function AnalyzePageContents(props: { accessToken: string }) {
  let currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);

  const { data: yearlySummaries } = trainingStatisticsSuspenseQuery(
    props.accessToken,
    year,
    'trainer',
  );

  const { data: maxCentsPerYear } = getMaxCentsPerYearQuery(props.accessToken);

  return (
    <Stack>
      <DatePicker
        views={['year']}
        label="Jahr"
        value={dayjs(`${year}-01-01`)}
        minDate={dayjs(`2023-01-01`)}
        maxDate={dayjs(`${currentYear}-01-01`)}
        onChange={(value) => {
          if (!value) return;
          setYear(value.year());
        }}
        sx={{ mb: 3, width: 140 }}
      />
      <YearlyTotalsTable
        totals={yearlySummaries}
        maxCentsPerYear={maxCentsPerYear}
      />
    </Stack>
  );
}

export default function AnalyzePage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <AnalyzePageContents accessToken={session.accessToken} />;
}
