/**
 * @vitest-environment jsdom
 */
// this polyfill helps with the following error-message:
// ReferenceError: Request is not defined
import 'cross-fetch/polyfill';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { HomePage } from '@/app/HomePage';
import { selectOneUser } from '@/app/api/users/[userId]/select-one-user';

import { describe, expect, test, vi, Mock } from 'vitest';
import '@testing-library/jest-dom/vitest';

// https://github.com/remarkjs/react-markdown/issues/635#issuecomment-991137447
vi.mock('react-markdown', () => ({
  default: (props: { children: React.ReactNode }) => <>{props.children}</>,
}));

vi.mock('next-auth/jwt', () => () => {});

vi.mock('@/app/api/users/[userId]/select-one-user', () => ({
  __esModule: true,
  selectOneUser: vi.fn(),
}));

describe('HomePage', () => {
  test('shows warning if trainer and iban is not set', async () => {
    (selectOneUser as Mock).mockReturnValueOnce(
      Promise.resolve({
        groups: ['trainers'],
        iban: null,
      }),
    );

    // needs to be awaited here because render() does not accept async components
    const homepage = await HomePage({ userId: 'any-user-id' });

    const { unmount } = render(homepage);

    expect(
      await screen.findByText('Bitte die IBAN im Profil eintragen.'),
    ).toBeVisible();

    unmount();
  });

  test('shows no warning if admin and iban is not set', async () => {
    (selectOneUser as Mock).mockReturnValueOnce(
      Promise.resolve({
        groups: ['admins'],
        iban: null,
      }),
    );

    // needs to be awaited here because render() does not accept async components
    const homepage = await HomePage({ userId: 'any-user-id' });

    const { unmount } = render(homepage);

    expect(
      await screen.findByText('Bitte die IBAN im Profil eintragen.'),
    ).not.toBeVisible();

    unmount();
  });

  test('shows no warning if trainer and iban is set', async () => {
    (selectOneUser as Mock).mockReturnValueOnce(
      Promise.resolve({
        groups: ['admins'],
        iban: 'any-iban',
      }),
    );

    // needs to be awaited here because render() does not accept async components
    const homepage = await HomePage({ userId: 'any-user-id' });

    const { unmount } = render(homepage);

    expect(
      await screen.findByText('Bitte die IBAN im Profil eintragen.'),
    ).not.toBeVisible();

    unmount();
  });
});
