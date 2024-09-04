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

export default function ConfigureLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/configure') {
    redirect('/configure/courses');
  }
  let value;
  switch (pathname) {
    case '/offerings/courses':
      value = 0;
      break;
    case '/offerings/cost-centers':
      value = 1;
      break;
    default:
      value = 0;
  }

  return <React.Fragment>
    <ErrorBoundary fallbackRender={PleaseReload} onError={logError}>

      <Tabs orientation={'horizontal'} value={value}>
        <Tab label="Kurse" value={0} component={Link} href={'/offerings/courses'} />
        <Tab label="Kostenstellen" value={1} component={Link} href={'/offerings/cost-centers'} />
      </Tabs>
      <Box sx={{ b: 1 }}>
        <Suspense fallback={<LoadingSpinner />}>
          {children}
        </Suspense>
      </Box>
    </ErrorBoundary>
  </React.Fragment>;
}