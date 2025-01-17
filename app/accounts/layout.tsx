'use client';

import React, { ErrorInfo, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import PleaseReload from '@/components/PleaseReload';

const logError = (error: Error, info: ErrorInfo) => {
  console.log(error);
};

export default function AccountsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <React.Fragment>
      <ErrorBoundary fallbackRender={PleaseReload} onError={logError}>
        <Suspense fallback={<LoadingSpinner />}>{children}</Suspense>
      </ErrorBoundary>
    </React.Fragment>
  );
}
