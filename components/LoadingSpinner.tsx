import Stack from '@mui/system/Stack';
import { CircularProgress } from '@mui/material';
import React from 'react';

export function LoadingSpinner() {
  return (
    <Stack sx={{ alignItems: 'center' }}>
      <CircularProgress />{' '}
    </Stack>
  );
}
