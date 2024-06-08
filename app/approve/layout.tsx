"use client";

import React, { ErrorInfo } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Typography } from '@mui/material';
import Button from '@mui/material/Button';


function pleaseReload({ error, resetErrorBoundary }: FallbackProps) {
  return <React.Fragment>
    <Typography>Etwas ist beim Laden der Seite schiefgelaufen. Bitte neu laden.</Typography>
    <Typography>Technische Fehlermeldung: {error.message ?? "nicht verfügbar"}</Typography>
    <Button onClick={resetErrorBoundary}>Neu versuchen</Button>
  </React.Fragment>
}

const logError = (error: Error, info: ErrorInfo) => {
  console.log(error);
}

export default function ApproveLayout({children}: {children: React.ReactNode}) {
  return <React.Fragment>
    <ErrorBoundary fallbackRender={pleaseReload} onError={logError}>
      {children}
    </ErrorBoundary>
  </React.Fragment>
}