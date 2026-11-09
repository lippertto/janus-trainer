/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { SignOutOnSessionError } from '@/app/SignOutOnSessionError';

const useSessionMock = vi.fn();
const signOutMock = vi.fn();

vi.mock('next-auth/react', () => ({
  useSession: () => useSessionMock(),
  signOut: (...args: unknown[]) => signOutMock(...args),
}));

describe('SignOutOnSessionError', () => {
  beforeEach(() => {
    signOutMock.mockReset();
    useSessionMock.mockReset();
  });
  afterEach(cleanup);

  test('signs out and goes to /login when the refresh failed', () => {
    useSessionMock.mockReturnValue({
      status: 'authenticated',
      data: { error: 'RefreshAccessTokenError' },
    });
    render(<SignOutOnSessionError />);
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledWith({ callbackUrl: '/login' });
  });

  test('does nothing for a healthy session', () => {
    useSessionMock.mockReturnValue({
      status: 'authenticated',
      data: { userId: 'u' },
    });
    render(<SignOutOnSessionError />);
    expect(signOutMock).not.toHaveBeenCalled();
  });

  test('does nothing without a session', () => {
    useSessionMock.mockReturnValue({ status: 'unauthenticated', data: null });
    render(<SignOutOnSessionError />);
    expect(signOutMock).not.toHaveBeenCalled();
  });

  test('signs out only once across re-renders', () => {
    useSessionMock.mockReturnValue({
      status: 'authenticated',
      data: { error: 'RefreshAccessTokenError' },
    });
    const { rerender } = render(<SignOutOnSessionError />);
    rerender(<SignOutOnSessionError />);
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });

  test('renders nothing', () => {
    useSessionMock.mockReturnValue({ status: 'unauthenticated', data: null });
    const { container } = render(<SignOutOnSessionError />);
    expect(container).toBeEmptyDOMElement();
  });
});
