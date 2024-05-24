'use client';

import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/de';
import React from 'react';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { SessionProvider } from 'next-auth/react';
import { deDE } from '@mui/x-data-grid';
import { SnackbarProvider } from 'notistack';

import { MaterialDesignContent } from 'notistack';
import { styled } from '@mui/material/styles';
import { ConfirmProvider } from 'material-ui-confirm';

const theme = createTheme({}, deDE);

const StyledSnackbarContent = styled(MaterialDesignContent)(() => ({
  '&.notistack-MuiContent-success': {
    fontFamily: theme.typography.fontFamily,
  },
  '&.notistack-MuiContent-error': {
    fontFamily: theme.typography.fontFamily,
  },
  '&.notistack-MuiContent-warning': {
    fontFamily: theme.typography.fontFamily,
  },
}));

export default function JanusProviders({
  children,
}: {
  children: React.ReactElement;
}) {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <SnackbarProvider
          Components={{
            success: StyledSnackbarContent,
            error: StyledSnackbarContent,
            warning: StyledSnackbarContent,
          }}
        >
          <ConfirmProvider
            defaultOptions={{
              confirmationButtonProps: { autoFocus: true },
              confirmationText: 'Ok',
              cancellationText: 'Abbrechen',
            }}
          >
            <SessionProvider>{children}</SessionProvider>
          </ConfirmProvider>
        </SnackbarProvider>
      </LocalizationProvider>
    </ThemeProvider>
  );
}