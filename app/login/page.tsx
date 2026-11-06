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
import {
  API_AUTH_RESPOND_TO_NEW_PASSWORD_CHALLENGE,
  API_AUTH_SIGN_IN,
} from '@/lib/routes';

// See data-model.md. The forgot-password steps are added together with their forms.
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

type NewPasswordFormData = {
  newPassword: string;
  confirmPassword: string;
};

const GENERIC_SIGN_IN_ERROR =
  'Anmeldung fehlgeschlagen. Bitte versuche es erneut.';
const PASSWORD_SAVED_MESSAGE =
  'Dein neues Passwort wurde gespeichert, aber die Anmeldung ist fehlgeschlagen. Bitte melde dich mit dem neuen Passwort an.';
const ACCESS_DENIED_MESSAGE =
  'Dein Konto ist in dieser App nicht freigeschaltet. Bitte wende dich an einen Administrator.';

type UserFacingErrorKind =
  /** The server answered with 401. */
  | 'unauthorized'
  /** The account exists in Cognito but not in this app. */
  | 'access-denied'
  /** The login ticket could not be exchanged for a session. */
  | 'sign-in-failed'
  | 'other';

/** An error whose message is meant to be shown to the user as is. */
class UserFacingError extends Error {
  constructor(
    message: string,
    readonly kind: UserFacingErrorKind = 'other',
  ) {
    super(message);
  }
}

type Notice = { severity: 'info' | 'warning' | 'error'; message: string };

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
    throw new UserFacingError(
      message,
      response.status === 401 ? 'unauthorized' : 'other',
    );
  }
  return (await response.json()) as T;
}

/** Exchanges the login ticket for a NextAuth session. Never put the ticket anywhere else. */
async function completeSignIn(ticket: string): Promise<void> {
  const result = await signIn('credentials', { redirect: false, ticket });
  if (!result || result.error) {
    if (result?.error === 'AccessDenied') {
      throw new UserFacingError(ACCESS_DENIED_MESSAGE, 'access-denied');
    }
    throw new UserFacingError(GENERIC_SIGN_IN_ERROR, 'sign-in-failed');
  }
}

function SignInForm(props: {
  initialEmail: string;
  notice: Notice | null;
  onChallenge: (challenge: {
    email: string;
    challengeUsername: string;
    cognitoSession: string;
  }) => void;
  onSignedIn: () => void;
  disabled: boolean;
}) {
  const { control, handleSubmit, getValues } = useForm<SignInFormData>({
    defaultValues: { email: props.initialEmail, password: '' },
  });

  const signInMutation = useMutation({
    // Takes no variables on purpose: React Query keeps a mutation's variables in its cache, and
    // the password must not end up there. The values are read from the form when the call starts.
    mutationFn: async () => {
      const data = getValues();
      const response = await postJson<SignInResponse>(API_AUTH_SIGN_IN, data);
      if (response.status === 'SUCCESS') {
        await completeSignIn(response.ticket);
        props.onSignedIn();
      } else {
        props.onChallenge({
          email: data.email,
          challengeUsername: response.challengeUsername,
          cognitoSession: response.session,
        });
      }
      // Return nothing: a mutation's result is kept in React Query's cache, and neither the
      // ticket nor the Cognito session may end up there.
      return null;
    },
  });

  const pending = signInMutation.isPending || props.disabled;

  return (
    <form onSubmit={handleSubmit(() => signInMutation.mutate())} noValidate>
      <Stack spacing={2}>
        {props.notice && (
          <Alert severity={props.notice.severity} data-testid="login-notice">
            {props.notice.message}
          </Alert>
        )}
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

function NewPasswordForm(props: {
  email: string;
  challengeUsername: string;
  cognitoSession: string;
  onSignedIn: () => void;
  /** Leaves the form, e.g. because the Cognito session ran out. */
  onBackToSignIn: (notice: Notice) => void;
  disabled: boolean;
}) {
  const { control, handleSubmit, getValues } = useForm<NewPasswordFormData>({
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    // Takes no variables on purpose, see SignInForm: nothing secret may end up in React Query's
    // cache. The Cognito session is a prop, not a variable, for the same reason.
    mutationFn: async () => {
      const response = await postJson<{ status: 'SUCCESS'; ticket: string }>(
        API_AUTH_RESPOND_TO_NEW_PASSWORD_CHALLENGE,
        {
          email: props.email,
          challengeUsername: props.challengeUsername,
          newPassword: getValues('newPassword'),
          session: props.cognitoSession,
        },
      );
      await completeSignIn(response.ticket);
      return null;
    },
    onSuccess: () => props.onSignedIn(),
    onError: (error) => {
      if (!(error instanceof UserFacingError)) return;
      if (error.kind === 'unauthorized') {
        // The Cognito session ran out: the user has to start over.
        props.onBackToSignIn({ severity: 'warning', message: error.message });
      } else if (error.kind === 'access-denied') {
        props.onBackToSignIn({ severity: 'error', message: error.message });
      } else if (error.kind === 'sign-in-failed') {
        // The password was changed already, so signing in with the new one is all that is left.
        props.onBackToSignIn({
          severity: 'info',
          message: PASSWORD_SAVED_MESSAGE,
        });
      }
      // everything else (e.g. InvalidPassword) is shown inline, and the user can retry
    },
  });

  const pending = mutation.isPending || props.disabled;
  const inlineError =
    mutation.isError &&
    !(
      mutation.error instanceof UserFacingError &&
      mutation.error.kind !== 'other'
    )
      ? mutation.error instanceof UserFacingError
        ? mutation.error.message
        : GENERIC_SIGN_IN_ERROR
      : null;

  return (
    <form onSubmit={handleSubmit(() => mutation.mutate())} noValidate>
      <Stack spacing={2}>
        <Typography>
          Du meldest dich zum ersten Mal an. Bitte wähle ein neues Passwort.
        </Typography>
        {inlineError && (
          <Alert severity="error" data-testid="new-password-error">
            {inlineError}
          </Alert>
        )}
        <Controller
          control={control}
          name="newPassword"
          // No length or character rules here: the password policy of the user pool is
          // authoritative, and Cognito's own message is shown if it is not met.
          rules={{ required: 'Bitte gib ein neues Passwort ein.' }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Neues Passwort"
              type="password"
              autoComplete="new-password"
              required
              autoFocus
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? ''}
              slotProps={{ htmlInput: { 'data-testid': 'new-password' } }}
            />
          )}
        />
        <Controller
          control={control}
          name="confirmPassword"
          rules={{
            required: 'Bitte wiederhole das neue Passwort.',
            validate: (value) =>
              value === getValues('newPassword') ||
              'Die Passwörter stimmen nicht überein.',
          }}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              label="Neues Passwort wiederholen"
              type="password"
              autoComplete="new-password"
              required
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? ''}
              slotProps={{
                htmlInput: { 'data-testid': 'new-password-confirm' },
              }}
            />
          )}
        />
        <Button
          type="submit"
          variant="contained"
          size="large"
          disabled={pending}
          sx={{ minHeight: 48 }}
          data-testid="new-password-submit"
        >
          Passwort speichern und anmelden
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
  // What to show on the sign-in step when the user was sent back to it.
  const [signInEmail, setSignInEmail] = React.useState('');
  const [notice, setNotice] = React.useState<Notice | null>(null);

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
            initialEmail={signInEmail}
            notice={notice}
            disabled={redirecting || signedIn}
            onChallenge={(challenge) => {
              setNotice(null);
              setViewState({ step: 'new-password-required', ...challenge });
            }}
            onSignedIn={goToCallbackUrl}
          />
        )}
        {viewState.step === 'new-password-required' && (
          <NewPasswordForm
            email={viewState.email}
            challengeUsername={viewState.challengeUsername}
            cognitoSession={viewState.cognitoSession}
            disabled={redirecting || signedIn}
            onSignedIn={goToCallbackUrl}
            onBackToSignIn={(backNotice) => {
              setSignInEmail(viewState.email);
              setNotice(backNotice);
              setViewState({ step: 'sign-in' });
            }}
          />
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
