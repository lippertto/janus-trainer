'use client';

import React, { ErrorInfo, Suspense } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import PleaseReload from '@/components/PleaseReload';
import { LoadingSpinner } from '@/components/LoadingSpinner';

const logError = (error: Error, info: ErrorInfo) => {
  console.log(error);
};

export default function EnterLayout({ children }: { children: React.ReactNode }) {
  return <React.Fragment>
    <ErrorBoundary fallbackRender={PleaseReload} onError={logError}>
      <Suspense fallback={<LoadingSpinner />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  </React.Fragment>;
}