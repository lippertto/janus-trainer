import { FallbackProps } from 'react-error-boundary';
import React from 'react';
import { Typography } from '@mui/material';
import Button from '@mui/material/Button';

export default function PleaseReload({ error, resetErrorBoundary }: FallbackProps) {
  return <React.Fragment>
    <Typography>Etwas ist beim Laden der Seite schiefgelaufen. Bitte neu laden.</Typography>
    <Typography>Technische Fehlermeldung: {error.message ?? "nicht verfügbar"}</Typography>
    <Button onClick={resetErrorBoundary}>Neu versuchen</Button>
  </React.Fragment>
}