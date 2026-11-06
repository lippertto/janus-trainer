'use client';
import React from 'react';
import { Typography } from '@mui/material';
import { useRouter } from 'next/navigation';
import Stack from '@mui/system/Stack';
import Button from '@mui/material/Button';
import { LoadingSpinner } from '@/components/LoadingSpinner';

function PleaseLogIn() {
  const router = useRouter();

  const goToLogin = () => {
    // Read the location at click time instead of using useSearchParams(), which would require a
    // Suspense boundary on every statically rendered page that shows this component.
    const callbackUrl = window.location.pathname + window.location.search;
    router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  };

  return (
    <Stack sx={{ alignItems: 'center' }}>
      <Typography>
        Melde dich mit einem Klick auf &quot;anmelden&quot; unten ein.
      </Typography>
      <Button onClick={goToLogin} data-testid="login-button">
        Anmelden
      </Button>
    </Stack>
  );
}

export default function LoginRequired({
  authenticationStatus,
}: {
  authenticationStatus: 'authenticated' | 'loading' | 'unauthenticated';
}) {
  return (
    <>
      {authenticationStatus === 'loading' ? (
        <LoadingSpinner />
      ) : (
        <PleaseLogIn />
      )}
    </>
  );
}
