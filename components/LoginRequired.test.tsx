/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import LoginRequired from '@/components/LoginRequired';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

const signInMock = vi.fn();
vi.mock('next-auth/react', () => ({
  signIn: (...args: unknown[]) => signInMock(...args),
}));

describe('LoginRequired', () => {
  beforeEach(() => {
    pushMock.mockReset();
    signInMock.mockReset();
  });
  afterEach(cleanup);

  test('the login button navigates to /login with the current page as callbackUrl', () => {
    window.history.pushState({}, '', '/approve?course=7&x=a b');
    render(<LoginRequired authenticationStatus="unauthenticated" />);
    fireEvent.click(screen.getByTestId('login-button'));
    expect(pushMock).toHaveBeenCalledWith(
      `/login?callbackUrl=${encodeURIComponent('/approve?course=7&x=a%20b')}`,
    );
    expect(signInMock).not.toHaveBeenCalled();
  });

  test('works on the root page', () => {
    window.history.pushState({}, '', '/');
    render(<LoginRequired authenticationStatus="unauthenticated" />);
    fireEvent.click(screen.getByTestId('login-button'));
    expect(pushMock).toHaveBeenCalledWith('/login?callbackUrl=%2F');
  });
});
