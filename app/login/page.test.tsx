/**
 * @vitest-environment jsdom
 */
import 'cross-fetch/polyfill';
import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginPage from '@/app/login/page';

const replaceMock = vi.fn();
const refreshMock = vi.fn();
let searchParams = new URLSearchParams();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: replaceMock, refresh: refreshMock }),
  useSearchParams: () => searchParams,
}));

const signInMock = vi.fn();
const useSessionMock = vi.fn();
vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
  useSession: () => useSessionMock(),
}));

const showSuccessMock = vi.fn();
vi.mock('@/lib/notifications', () => ({
  showSuccess: (...args: unknown[]) => showSuccessMock(...args),
}));

const fetchMock = vi.fn();

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

let queryClient: QueryClient;

function renderPage() {
  queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginPage />
    </QueryClientProvider>,
  );
}

async function fillAndSubmit(email = 'trainer@example.com', password = 'pw') {
  const user = userEvent.setup();
  await user.type(screen.getByTestId('login-email'), email);
  await user.type(screen.getByTestId('login-password'), password);
  await user.click(screen.getByTestId('login-submit'));
}

describe('LoginPage, sign-in step', () => {
  beforeEach(() => {
    replaceMock.mockReset();
    refreshMock.mockReset();
    signInMock.mockReset();
    fetchMock.mockReset();
    searchParams = new URLSearchParams();
    useSessionMock.mockReturnValue({ status: 'unauthenticated', data: null });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  test('renders email and password fields with mobile-friendly attributes', () => {
    renderPage();
    const email = screen.getByTestId('login-email');
    const password = screen.getByTestId('login-password');
    expect(email).toHaveAttribute('type', 'email');
    expect(email).toHaveAttribute('inputmode', 'email');
    expect(email).toHaveAttribute('autocomplete', 'username');
    expect(password).toHaveAttribute('type', 'password');
    expect(password).toHaveAttribute('autocomplete', 'current-password');
  });

  test('success: posts credentials, signs in with the ticket only, and redirects', async () => {
    searchParams = new URLSearchParams({ callbackUrl: '/approve?x=1' });
    fetchMock.mockResolvedValue(
      jsonResponse(200, { status: 'SUCCESS', ticket: 'the-ticket' }),
    );
    signInMock.mockResolvedValue({ ok: true, error: undefined });
    renderPage();

    await fillAndSubmit('trainer@example.com', 'pw');

    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith('/approve?x=1'),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/sign-in',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'trainer@example.com', password: 'pw' }),
      }),
    );
    expect(signInMock).toHaveBeenCalledWith('credentials', {
      redirect: false,
      ticket: 'the-ticket',
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  test('neither the ticket nor the password stays in the React Query cache', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { status: 'SUCCESS', ticket: 'the-ticket' }),
    );
    signInMock.mockResolvedValue({ ok: true });
    renderPage();
    await fillAndSubmit('trainer@example.com', 'my-password');
    await waitFor(() => expect(replaceMock).toHaveBeenCalled());

    const cached = JSON.stringify(
      queryClient
        .getMutationCache()
        .getAll()
        .map((m) => m.state),
    );
    expect(cached).not.toContain('the-ticket');
    expect(cached).not.toContain('my-password');
  });

  test('a malicious callbackUrl is replaced by /', async () => {
    searchParams = new URLSearchParams({ callbackUrl: 'https://evil.example' });
    fetchMock.mockResolvedValue(
      jsonResponse(200, { status: 'SUCCESS', ticket: 't' }),
    );
    signInMock.mockResolvedValue({ ok: true });
    renderPage();
    await fillAndSubmit();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/'));
  });

  test('wrong credentials: inline error, email is kept, no signIn call', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(401, {
        error: {
          code: 'Unauthorized',
          message: 'E-Mail oder Passwort ist falsch.',
        },
      }),
    );
    renderPage();
    await fillAndSubmit('trainer@example.com', 'bad');

    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'E-Mail oder Passwort ist falsch.',
    );
    expect(screen.getByTestId('login-email')).toHaveValue(
      'trainer@example.com',
    );
    expect(signInMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('login-submit')).toBeEnabled();
  });

  test('AccessDenied from signIn shows the "not enabled" message', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { status: 'SUCCESS', ticket: 't' }),
    );
    signInMock.mockResolvedValue({ ok: false, error: 'AccessDenied' });
    renderPage();
    await fillAndSubmit();

    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'Dein Konto ist in dieser App nicht freigeschaltet. Bitte wende dich an einen Administrator.',
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  test('any other signIn error shows a generic failure', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { status: 'SUCCESS', ticket: 't' }),
    );
    signInMock.mockResolvedValue({ ok: false, error: 'CredentialsSignin' });
    renderPage();
    await fillAndSubmit();

    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'Anmeldung fehlgeschlagen',
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  test('a network failure shows a generic error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    renderPage();
    await fillAndSubmit();
    expect(await screen.findByTestId('login-error')).toHaveTextContent(
      'Anmeldung fehlgeschlagen',
    );
  });

  test('the submit button is disabled while the request is pending', async () => {
    let resolveFetch: (r: Response) => void = () => {};
    fetchMock.mockReturnValue(
      new Promise<Response>((resolve) => (resolveFetch = resolve)),
    );
    renderPage();
    await fillAndSubmit();

    await waitFor(() =>
      expect(screen.getByTestId('login-submit')).toBeDisabled(),
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFetch(
      jsonResponse(401, { error: { code: 'Unauthorized', message: 'nope' } }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('login-submit')).toBeEnabled(),
    );
  });

  test('an already signed-in user is redirected to the callbackUrl', async () => {
    searchParams = new URLSearchParams({ callbackUrl: '/enter' });
    useSessionMock.mockReturnValue({
      status: 'authenticated',
      data: { userId: 'u' },
    });
    renderPage();
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/enter'));
  });

  test('a session with a refresh error is not treated as signed in', () => {
    useSessionMock.mockReturnValue({
      status: 'authenticated',
      data: { error: 'RefreshAccessTokenError' },
    });
    renderPage();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});

describe('LoginPage, new-password-required step', () => {
  const NEW_PASSWORD = 'N3w-secret-pw!';
  const COGNITO_SESSION = 'cognito-session-string';

  beforeEach(() => {
    replaceMock.mockReset();
    refreshMock.mockReset();
    signInMock.mockReset();
    fetchMock.mockReset();
    searchParams = new URLSearchParams();
    useSessionMock.mockReturnValue({ status: 'unauthenticated', data: null });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const challengeResponse = () =>
    jsonResponse(200, {
      status: 'CHALLENGE',
      challengeName: 'NEW_PASSWORD_REQUIRED',
      session: COGNITO_SESSION,
      challengeUsername: 'uuid-username',
    });

  async function reachNewPasswordStep() {
    fetchMock.mockResolvedValueOnce(challengeResponse());
    renderPage();
    await fillAndSubmit('trainer@example.com', 'temporary-pw');
    await screen.findByTestId('new-password');
  }

  async function submitNewPassword(
    password = NEW_PASSWORD,
    confirm = password,
  ) {
    const user = userEvent.setup();
    await user.type(screen.getByTestId('new-password'), password);
    await user.type(screen.getByTestId('new-password-confirm'), confirm);
    await user.click(screen.getByTestId('new-password-submit'));
  }

  test('the challenge switches to the new-password form with the right attributes', async () => {
    await reachNewPasswordStep();
    expect(screen.queryByTestId('login-password')).not.toBeInTheDocument();
    for (const id of ['new-password', 'new-password-confirm']) {
      expect(screen.getByTestId(id)).toHaveAttribute('type', 'password');
      expect(screen.getByTestId(id)).toHaveAttribute(
        'autocomplete',
        'new-password',
      );
    }
    expect(signInMock).not.toHaveBeenCalled();
  });

  test('submits challengeUsername and session, then signs in with the ticket only', async () => {
    searchParams = new URLSearchParams({ callbackUrl: '/enter' });
    await reachNewPasswordStep();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: 'SUCCESS', ticket: 'the-ticket' }),
    );
    signInMock.mockResolvedValue({ ok: true });

    await submitNewPassword();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/enter'));
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/auth/respond-to-new-password-challenge',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'trainer@example.com',
          challengeUsername: 'uuid-username',
          newPassword: NEW_PASSWORD,
          session: COGNITO_SESSION,
        }),
      }),
    );
    expect(signInMock).toHaveBeenCalledWith('credentials', {
      redirect: false,
      ticket: 'the-ticket',
    });
    expect(refreshMock).toHaveBeenCalled();
  });

  test('mismatching confirmation: inline error and nothing is sent', async () => {
    await reachNewPasswordStep();
    await submitNewPassword(NEW_PASSWORD, 'something-else');

    expect(
      await screen.findByText('Die Passwörter stimmen nicht überein.'),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the sign-in call
  });

  test('does not apply any password length rule itself', async () => {
    await reachNewPasswordStep();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: 'SUCCESS', ticket: 't' }),
    );
    signInMock.mockResolvedValue({ ok: true });
    await submitNewPassword('a');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  test('InvalidPassword: inline error, form stays, retry reuses the Cognito session', async () => {
    await reachNewPasswordStep();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        error: {
          code: 'InvalidPassword',
          message: 'Das Passwort erfüllt die Anforderungen nicht. too short',
        },
      }),
    );
    await submitNewPassword('short');

    expect(await screen.findByTestId('new-password-error')).toHaveTextContent(
      'Das Passwort erfüllt die Anforderungen nicht. too short',
    );
    expect(screen.getByTestId('new-password')).toBeVisible();
    expect(screen.getByTestId('new-password-submit')).toBeEnabled();

    // retry with a valid password
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: 'SUCCESS', ticket: 'the-ticket' }),
    );
    signInMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    await user.clear(screen.getByTestId('new-password'));
    await user.clear(screen.getByTestId('new-password-confirm'));
    await submitNewPassword(NEW_PASSWORD);

    await waitFor(() => expect(replaceMock).toHaveBeenCalled());
    const lastBody = JSON.parse(fetchMock.mock.lastCall![1].body);
    expect(lastBody.session).toBe(COGNITO_SESSION);
    expect(lastBody.newPassword).toBe(NEW_PASSWORD);
  });

  test('expired session (401): back to sign-in with a message, email kept', async () => {
    await reachNewPasswordStep();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, {
        error: {
          code: 'Unauthorized',
          message: 'Die Sitzung ist abgelaufen. Bitte melde dich erneut an.',
        },
      }),
    );
    await submitNewPassword();

    expect(await screen.findByTestId('login-notice')).toHaveTextContent(
      'Die Sitzung ist abgelaufen. Bitte melde dich erneut an.',
    );
    expect(screen.getByTestId('login-email')).toHaveValue(
      'trainer@example.com',
    );
    expect(screen.getByTestId('login-password')).toHaveValue('');
    expect(screen.queryByTestId('new-password')).not.toBeInTheDocument();
    expect(signInMock).not.toHaveBeenCalled();
  });

  test('AccessDenied after the password change: back to sign-in with the German message', async () => {
    await reachNewPasswordStep();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: 'SUCCESS', ticket: 't' }),
    );
    signInMock.mockResolvedValue({ ok: false, error: 'AccessDenied' });
    await submitNewPassword();

    expect(await screen.findByTestId('login-notice')).toHaveTextContent(
      'Dein Konto ist in dieser App nicht freigeschaltet. Bitte wende dich an einen Administrator.',
    );
    expect(replaceMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('login-email')).toHaveValue(
      'trainer@example.com',
    );
  });

  test('another signIn failure after the password change says the password was saved', async () => {
    await reachNewPasswordStep();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: 'SUCCESS', ticket: 't' }),
    );
    signInMock.mockResolvedValue({ ok: false, error: 'CredentialsSignin' });
    await submitNewPassword();

    expect(await screen.findByTestId('login-notice')).toHaveTextContent(
      'Dein neues Passwort wurde gespeichert',
    );
  });

  test('the submit button is disabled while the request is pending', async () => {
    await reachNewPasswordStep();
    let resolveFetch: (r: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => (resolveFetch = resolve)),
    );
    await submitNewPassword();

    await waitFor(() =>
      expect(screen.getByTestId('new-password-submit')).toBeDisabled(),
    );
    resolveFetch(
      jsonResponse(400, {
        error: { code: 'InvalidPassword', message: 'nope' },
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('new-password-submit')).toBeEnabled(),
    );
  });

  test('neither the new password, the Cognito session nor the ticket stay in the React Query cache', async () => {
    await reachNewPasswordStep();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: 'SUCCESS', ticket: 'the-ticket' }),
    );
    signInMock.mockResolvedValue({ ok: true });
    await submitNewPassword();
    await waitFor(() => expect(replaceMock).toHaveBeenCalled());

    const cached = JSON.stringify(
      queryClient
        .getMutationCache()
        .getAll()
        .map((m) => m.state),
    );
    for (const secret of [
      NEW_PASSWORD,
      COGNITO_SESSION,
      'the-ticket',
      'temporary-pw',
    ]) {
      expect(cached).not.toContain(secret);
    }
  });
});

describe('LoginPage, forgot-password steps', () => {
  const CODE = '918273';
  const NEW_PASSWORD = 'N3w-secret-pw!';
  const SENT_TOAST =
    'Falls ein Konto mit dieser E-Mail existiert, wurde ein Code gesendet.';

  beforeEach(() => {
    replaceMock.mockReset();
    refreshMock.mockReset();
    signInMock.mockReset();
    fetchMock.mockReset();
    showSuccessMock.mockReset();
    searchParams = new URLSearchParams();
    useSessionMock.mockReturnValue({ status: 'unauthenticated', data: null });
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  async function openRequestStep(typedEmail = '') {
    renderPage();
    const user = userEvent.setup();
    if (typedEmail) {
      await user.type(screen.getByTestId('login-email'), typedEmail);
    }
    await user.click(screen.getByTestId('forgot-password-link'));
    await screen.findByTestId('forgot-email');
    return user;
  }

  async function reachConfirmStep(email = 'someone@example.com') {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: 'CODE_SENT' }));
    const user = await openRequestStep();
    await user.type(screen.getByTestId('forgot-email'), email);
    await user.click(screen.getByTestId('forgot-submit'));
    await screen.findByTestId('reset-code');
    return user;
  }

  async function submitConfirm(
    user: ReturnType<typeof userEvent.setup>,
    code = CODE,
    password = NEW_PASSWORD,
    confirmation = password,
  ) {
    await user.clear(screen.getByTestId('reset-code'));
    await user.clear(screen.getByTestId('reset-new-password'));
    await user.clear(screen.getByTestId('reset-new-password-confirm'));
    await user.type(screen.getByTestId('reset-code'), code);
    await user.type(screen.getByTestId('reset-new-password'), password);
    await user.type(
      screen.getByTestId('reset-new-password-confirm'),
      confirmation,
    );
    await user.click(screen.getByTestId('reset-submit'));
  }

  test('the sign-in step links to the request step and prefills the typed email', async () => {
    await openRequestStep('typed@example.com');
    expect(screen.getByTestId('forgot-email')).toHaveValue('typed@example.com');
    expect(screen.queryByTestId('login-password')).not.toBeInTheDocument();
    expect(screen.getByTestId('forgot-email')).toHaveAttribute(
      'inputmode',
      'email',
    );
  });

  test('"back" returns to sign-in', async () => {
    const user = await openRequestStep('typed@example.com');
    await user.click(screen.getByTestId('forgot-back'));
    expect(await screen.findByTestId('login-password')).toBeVisible();
    expect(screen.getByTestId('login-email')).toHaveValue('typed@example.com');
  });

  test('requesting a code posts the email, shows the toast and moves to the confirm step', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: 'CODE_SENT' }));
    const user = await openRequestStep();
    await user.type(screen.getByTestId('forgot-email'), 'someone@example.com');
    await user.click(screen.getByTestId('forgot-submit'));

    expect(await screen.findByTestId('reset-code')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/auth/forgot-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ email: 'someone@example.com' }),
      }),
    );
    expect(showSuccessMock).toHaveBeenCalledWith(SENT_TOAST);
  });

  test('an unknown email gets the identical toast and step (server answers CODE_SENT)', async () => {
    // the server answers the same for unknown accounts, so the page cannot tell them apart
    await reachConfirmStep('nobody@example.com');
    expect(showSuccessMock).toHaveBeenCalledWith(SENT_TOAST);
  });

  test('a server failure on the request step is shown inline and keeps the step', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, {
        error: { code: 'InternalServerError', message: 'Es ist ein Fehler.' },
      }),
    );
    const user = await openRequestStep();
    await user.type(screen.getByTestId('forgot-email'), 'someone@example.com');
    await user.click(screen.getByTestId('forgot-submit'));

    expect(await screen.findByTestId('forgot-error')).toHaveTextContent(
      'Es ist ein Fehler.',
    );
    expect(screen.queryByTestId('reset-code')).not.toBeInTheDocument();
    expect(showSuccessMock).not.toHaveBeenCalled();
  });

  test('the confirm step has mobile-friendly attributes', async () => {
    await reachConfirmStep();
    expect(screen.getByTestId('reset-code')).toHaveAttribute(
      'autocomplete',
      'one-time-code',
    );
    expect(screen.getByTestId('reset-code')).toHaveAttribute(
      'inputmode',
      'numeric',
    );
    for (const id of ['reset-new-password', 'reset-new-password-confirm']) {
      expect(screen.getByTestId(id)).toHaveAttribute(
        'autocomplete',
        'new-password',
      );
    }
  });

  test('confirming posts email, code and new password, then returns to sign-in with the email kept', async () => {
    const user = await reachConfirmStep('someone@example.com');
    showSuccessMock.mockReset();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: 'PASSWORD_RESET' }),
    );
    await submitConfirm(user);

    expect(await screen.findByTestId('login-password')).toBeVisible();
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/auth/confirm-forgot-password',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          email: 'someone@example.com',
          confirmationCode: CODE,
          newPassword: NEW_PASSWORD,
        }),
      }),
    );
    expect(showSuccessMock).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('login-email')).toHaveValue(
      'someone@example.com',
    );
    expect(screen.getByTestId('login-password')).toHaveValue('');
    // the user is NOT signed in automatically
    expect(signInMock).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  test('mismatching confirmation: inline error and nothing is sent', async () => {
    const user = await reachConfirmStep();
    await submitConfirm(user, CODE, NEW_PASSWORD, 'something-else');
    expect(
      await screen.findByText('Die Passwörter stimmen nicht überein.'),
    ).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the request call
  });

  test('a wrong code is shown inline and the user can retry', async () => {
    const user = await reachConfirmStep();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        error: { code: 'CodeMismatch', message: 'Der Code ist falsch.' },
      }),
    );
    await submitConfirm(user);

    expect(await screen.findByTestId('reset-error')).toHaveTextContent(
      'Der Code ist falsch.',
    );
    expect(screen.queryByTestId('reset-new-code')).not.toBeInTheDocument();
    expect(screen.getByTestId('reset-submit')).toBeEnabled();

    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: 'PASSWORD_RESET' }),
    );
    await submitConfirm(user, '111111');
    expect(await screen.findByTestId('login-password')).toBeVisible();
  });

  test('an expired code offers to request a new one, which stays on the confirm step', async () => {
    const user = await reachConfirmStep('someone@example.com');
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        error: {
          code: 'CodeExpired',
          message: 'Der Code ist abgelaufen, bitte fordere einen neuen an.',
        },
      }),
    );
    await submitConfirm(user);

    expect(await screen.findByTestId('reset-error')).toHaveTextContent(
      'abgelaufen',
    );
    showSuccessMock.mockReset();
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { status: 'CODE_SENT' }));
    await user.click(await screen.findByTestId('reset-new-code'));

    await waitFor(() =>
      expect(showSuccessMock).toHaveBeenCalledWith(SENT_TOAST),
    );
    expect(fetchMock).toHaveBeenLastCalledWith(
      '/api/auth/forgot-password',
      expect.objectContaining({
        body: JSON.stringify({ email: 'someone@example.com' }),
      }),
    );
    expect(screen.getByTestId('reset-code')).toBeVisible();
    expect(screen.getByTestId('reset-code')).toHaveValue('');
    expect(screen.queryByTestId('reset-error')).not.toBeInTheDocument();
  });

  test('a failed "new code" request shows its own error, keeps the button, and does not leave a stale error', async () => {
    const user = await reachConfirmStep();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        error: { code: 'CodeExpired', message: 'Der Code ist abgelaufen.' },
      }),
    );
    await submitConfirm(user);
    expect(await screen.findByTestId('reset-error')).toHaveTextContent(
      'Der Code ist abgelaufen.',
    );

    // requesting a new code fails: its error replaces the old one, and the button stays
    fetchMock.mockResolvedValueOnce(
      jsonResponse(500, {
        error: { code: 'InternalServerError', message: 'Serverfehler.' },
      }),
    );
    await user.click(screen.getByTestId('reset-new-code'));
    await waitFor(() =>
      expect(screen.getByTestId('reset-error')).toHaveTextContent(
        'Serverfehler.',
      ),
    );
    expect(screen.getByTestId('reset-new-code')).toBeVisible();

    // the next confirm attempt replaces that error in turn
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        error: { code: 'CodeMismatch', message: 'Der Code ist falsch.' },
      }),
    );
    await submitConfirm(user);
    await waitFor(() =>
      expect(screen.getByTestId('reset-error')).toHaveTextContent(
        'Der Code ist falsch.',
      ),
    );
    expect(screen.getByTestId('reset-error')).not.toHaveTextContent(
      'Serverfehler.',
    );
    expect(screen.queryByTestId('reset-new-code')).not.toBeInTheDocument();
  });

  test('InvalidPassword is shown inline with Cognito detail; no password rule of our own', async () => {
    const user = await reachConfirmStep();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(400, {
        error: {
          code: 'InvalidPassword',
          message: 'Das Passwort erfüllt die Anforderungen nicht. too short',
        },
      }),
    );
    await submitConfirm(user, CODE, 'a'); // one character: only Cognito may reject it
    expect(await screen.findByTestId('reset-error')).toHaveTextContent(
      'too short',
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('the submit button is disabled while the request is pending', async () => {
    const user = await reachConfirmStep();
    let resolveFetch: (r: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => (resolveFetch = resolve)),
    );
    await submitConfirm(user);
    await waitFor(() =>
      expect(screen.getByTestId('reset-submit')).toBeDisabled(),
    );
    resolveFetch(
      jsonResponse(400, {
        error: { code: 'CodeMismatch', message: 'Der Code ist falsch.' },
      }),
    );
    await waitFor(() =>
      expect(screen.getByTestId('reset-submit')).toBeEnabled(),
    );
  });

  test('neither the code nor the new password stay in the React Query cache', async () => {
    const user = await reachConfirmStep();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { status: 'PASSWORD_RESET' }),
    );
    await submitConfirm(user);
    await screen.findByTestId('login-password');

    const cached = JSON.stringify(
      queryClient
        .getMutationCache()
        .getAll()
        .map((m) => m.state),
    );
    for (const secret of [CODE, NEW_PASSWORD]) {
      expect(cached).not.toContain(secret);
    }
  });
});
