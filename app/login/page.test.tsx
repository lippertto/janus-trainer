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

  test('a CHALLENGE response does not dead-end', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        status: 'CHALLENGE',
        challengeName: 'NEW_PASSWORD_REQUIRED',
        session: 's',
        challengeUsername: 'u',
      }),
    );
    renderPage();
    await fillAndSubmit();

    expect(
      await screen.findByTestId('login-challenge-placeholder'),
    ).toBeVisible();
    expect(signInMock).not.toHaveBeenCalled();
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
