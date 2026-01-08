'use client';

import React, { ErrorInfo, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import PleaseReload from '@/components/PleaseReload';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { redirect, usePathname } from 'next/navigation';
import { Tab, Tabs } from '@mui/material';
import Link from '@mui/material/Link';
import Box from '@mui/system/Box';

const logError = (error: Error, info: ErrorInfo) => {
  console.log(error);
};

export default function ConfigureLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (pathname === '/analyze') {
    redirect('/analyze/yearly-totals');
  }
  let value;
  switch (pathname) {
    case '/analyze':
    case '/analyze/yearly-totals':
      value = 0;
      break;
    case '/analyze/count-per-cost-center':
      value = 1;
      break;
    case '/analyze/per-course':
      value = 2;
      break;
    default:
      value = 0;
  }

  return (
    <React.Fragment>
      <ErrorBoundary fallbackRender={PleaseReload} onError={logError}>
        <Tabs orientation={'horizontal'} value={value}>
          <Tab
            label="Nach ÜL"
            value={0}
            component={Link}
            href={'/analyze/yearly-totals'}
          />
          <Tab
            label="Nach Kostenstelle"
            value={1}
            component={Link}
            href={'/analyze/count-per-cost-center'}
          />
          <Tab
            label="Nach Kurs"
            value={2}
            component={Link}
            href={'/analyze/per-course'}
          />
        </Tabs>
        <Box sx={{ m: 2 }}>
          <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
        </Box>
      </ErrorBoundary>
    </React.Fragment>
  );
}
