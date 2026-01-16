'use client';

import React, { ErrorInfo } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import PleaseReload from '@/components/PleaseReload';

const logError = (error: unknown, info: ErrorInfo) => {
  console.log(error);
};

export default function OfferingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <React.Fragment>
      <ErrorBoundary fallbackRender={PleaseReload} onError={logError}>
        {children}
      </ErrorBoundary>
    </React.Fragment>
  );
}
