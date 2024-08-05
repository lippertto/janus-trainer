'use client';

import React, { ErrorInfo, Suspense } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import PleaseReload from '@/components/PleaseReload';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { redirect, usePathname } from 'next/navigation';
import { Tab, Tabs } from '@mui/material';
import Link from '@mui/material/Link';

const logError = (error: Error, info: ErrorInfo) => {
  console.log(error);
};

export default function ConfigureLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === '/configure') {
    redirect('/configure/holidays')
  }
  let value;
  switch (pathname) {
    case '/configure':
    case '/configure/holidays':
      value = 0;
      break;
    case '/configure/compensation-values':
      value = 1;
      break;
    case '/configure/cost-centers':
      value=2;
      break;
    default:
      value = 0;
  }

  return <React.Fragment>
    <ErrorBoundary fallbackRender={PleaseReload} onError={logError}>

      <Tabs orientation={'horizontal'} value={value} >
        <Tab label='Feiertage' value={0} component={Link} href={'/configure/holidays'} />
        <Tab label='Pauschalen' value={1}  component={Link} href={'/configure/compensation-values'}/>
        <Tab label='Kostenstellen' value={2}  component={Link} href={'/configure/cost-centers'}/>
      </Tabs>
      <Suspense fallback={<LoadingSpinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  </React.Fragment>;
}