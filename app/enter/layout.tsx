"use client";

import React, { ErrorInfo } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import PleaseReload from '@/components/PleaseReload';

const logError = (error: Error, info: ErrorInfo) => {
  console.log(error);
}

export default function EnterLayout({children}: {children: React.ReactNode}) {
  return <React.Fragment>
    <ErrorBoundary fallbackRender={PleaseReload} onError={logError}>
      {children}
    </ErrorBoundary>
  </React.Fragment>
}