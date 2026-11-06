'use client';

import React, { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { useMutation } from '@tanstack/react-query';
import { Controller, useForm } from 'react-hook-form';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { JanusSession } from '@/lib/auth';
import { safeCallbackUrl } from '@/lib/callback-url';
import { API_AUTH_SIGN_IN } from '@/lib/routes';

// See data-model.md. The remaining steps are added together with their forms.
type LoginViewState =
  | { step: 'sign-in' }
  | {
      step: 'new-password-required';
      email: string;
      challengeUsername: string;
      cognitoSession: string;
    };

type SignInFormData = {
  email: string;
  password: string;
};

const GENERIC_SIGN_IN_ERROR =
  'Anmeldung fehlgeschlagen. Bitte versuche es erneut.';
const ACCESS_DENIED_MESSAGE =
  'Dein Konto ist in dieser App nicht freigeschaltet. Bitte wende dich an einen Administrator.';

/** An error whose message is meant to be shown to the user as is. */
class UserFacingError extends Error {}

type SignInResponse =
  | { status: 'SUCCESS'; ticket: string }
  | {
      status: 'CHALLENGE';
      challengeName: 'NEW_PASSWORD_REQUIRED';
      session: string;
      challengeUsername: string;
    };

async function postJson<T>(route: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new UserFacingError(GENERIC_SIGN_IN_ERROR);
  }
  if (!response.ok) {
    let message = GENERIC_SIGN_IN_ERROR;
    try {
      const parsed = await response.json();
      if (typeof parsed?.error?.message === 'string') {
        message = parsed.error.message;
      }
    } catch {
      // keep the generic message
    }
    throw new UserFacingError(message);
  }
  return (await response.json()) as T;
}

/** Exchanges the login ticket for a NextAuth session. Never put the ticket anywhere else. */
async function completeSignIn(ticket: string): Promise<void> {
  const result = await signIn('credentials', { redirect: false, ticket });
  if (!result || result.error) {
    throw new UserFacingError(
      result?.error === 'AccessDenied'
        ? ACCESS_DENIED_MESSAGE
        : GENERIC_SIGN_IN_ERROR,
    );
  }
}

function SignInForm(props: {
  onChallenge: (challenge: {
    email: string;
    challengeUsername: string;
    cognitoSession: string;
  }) => void;
  onSignedIn: () => void;
  disabled: boolean;
}) {
  const { control, handleSubmit, getValues } = useForm<SignInFormData>({
    defaultValues: { email: '', password: '' },
  });

  const signInMutation = useMutation({
    // Takes no variables on purpose: React Query keeps a mutation's variables in its cache, and
    // the password must not end up there. The values are read from the form when the call starts.
    mutationFn: async () => {
      const data = getValues();
      const response = await postJson<SignInResponse>(API_AUTH_SIGN_IN, data);
      if (response.status === 'SUCCESS') {
        await completeSignIn(response.ticket);
        // Return nothing: the mutation result is kept in React Query's cache, and the ticket
        // must not end up there.
        return null;
      }
      return {
        email: data.email,
        challengeUsername: response.challengeUsername,
        cognitoSession: response.session,
      };
    },
    onSuccess: (challenge) => {
      if (challenge) {
        props.onChallenge(challenge);
      } else {
        props.onSignedIn();
      }
    },
  });

  const pending = signInMutation.isPending || props.disabled;

  return (
    <form onSubmit={handleSubmit(() => signInMutation.mutate())} noValidate>
      <Stack spacing={2}>
        {signInMutation.isError && (
          <Alert severity="error" data-testid="login-error">
            {signInMutation.error instanceof UserFacingError
              ? signInMutation.error.message
              : GENERIC_SIGN_IN_ERROR}
          </Alert>
        )}
        <Controller
          control={control}
          name="email"
          rules={{ required: 'Bitte gib deine E-Mail-Adresse ein.' }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="E-Mail"
              type="email"
              autoComplete="username"
              required
              autoFocus
              onChange={(e) => field.onChange(e.target.value.trim())}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? ''}
              slotProps={{
                htmlInput: { inputMode: 'email', 'data-testid': 'login-email' },
              }}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          rules={{ required: 'Bitte gib dein Passwort ein.' }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Passwort"
              type="password"
              autoComplete="current-password"
              required
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? ''}
              slotProps={{ htmlInput: { 'data-testid': 'login-password' } }}
            />
          )}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={pending}
          sx={{ minHeight: 48 }}
          data-testid="login-submit"
        >
          Anmelden
        </Button>
      </Stack>
    </form>
  );
}

function LoginPageContents() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [viewState, setViewState] = React.useState<LoginViewState>({
    step: 'sign-in',
  });
  const [redirecting, setRedirecting] = React.useState(false);

  const callbackUrl = safeCallbackUrl(searchParams.get('callbackUrl'));

  const goToCallbackUrl = React.useCallback(() => {
    setRedirecting(true);
    router.replace(callbackUrl);
    // make server components pick up the new session
    router.refresh();
  }, [router, callbackUrl]);

  // A visitor who is already signed in has no business here. A session that carries a refresh
  // error is not a usable session.
  const signedIn =
    status === 'authenticated' &&
    (session as JanusSession | null)?.error === undefined;
  React.useEffect(() => {
    if (signedIn) {
      router.replace(callbackUrl);
    }
  }, [signedIn, router, callbackUrl]);

  return (
    <Box
      sx={{ display: 'flex', justifyContent: 'center', px: 2, py: 4 }}
      data-testid="login-page"
    >
      <Paper sx={{ p: 3, width: '100%', maxWidth: 420 }}>
        <Typography variant="h5" component="h1" sx={{ mb: 2 }}>
          Janus Abrechnungs-App
        </Typography>
        {viewState.step === 'sign-in' && (
          <SignInForm
            disabled={redirecting || signedIn}
            onChallenge={(challenge) =>
              setViewState({ step: 'new-password-required', ...challenge })
            }
            onSignedIn={goToCallbackUrl}
          />
        )}
        {viewState.step === 'new-password-required' && (
          // Placeholder so the flow does not dead-end. Replaced by the real form in T020.
          <Alert severity="info" data-testid="login-challenge-placeholder">
            Bitte wähle ein neues Passwort. Dieser Schritt ist noch nicht
            verfügbar.
          </Alert>
        )}
      </Paper>
    </Box>
  );
}

export default function LoginPage() {
  // useSearchParams() needs a Suspense boundary so that the page can still be prerendered.
  return (
    <Suspense>
      <LoginPageContents />
    </Suspense>
  );
}
