'use client';

import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/de';
import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { SessionProvider } from 'next-auth/react';
import { deDE } from '@mui/x-data-grid';

const theme = createTheme({}, deDE);

export default function JanusProviders({
  children,
}: {
  children: React.ReactElement;
}) {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <SessionProvider>{children}</SessionProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}
