/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Profile from '@/app/profile/Profile';
import { Group, UserDto } from '@/lib/dto';
import { describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

vi.mock('@/lib/shared-queries', () => {
  return {
    termsOfServiceSuspenseQuery: vi.fn(() => ''),
    default: vi.fn(() => 'mocked baz'),
  };
});

// https://github.com/remarkjs/react-markdown/issues/635#issuecomment-991137447
vi.mock('react-markdown', () => {
  return {
    default: (props: { children: React.ReactNode }) => {
      return <>{props.children}</>;
    },
  };
});

describe('Profile', () => {
  test('happy case: handles groups', async () => {
    const user: UserDto = {
      id: 'any-id',
      name: 'any-name',
      iban: 'any-iban',
      email: 'any-email',
      groups: [Group.ADMINS],
      compensationClasses: [],
      termsAcceptedAt: null,
      termsAcceptedVersion: null,
    };
    const { unmount } = render(
      <Profile
        user={user}
        courses={[]}
        handleEditIbanClick={() => {}}
        accessToken="123"
      />,
    );

    const groupField = screen.getByTestId('profile-groups-textfield');
    // @ts-ignore IntelliJ thinks that value does not exist
    expect(groupField.value).toBe('Administration');
    unmount();
  });

  test('handles missing groups', async () => {
    const user: UserDto = {
      id: 'any-id',
      name: 'any-name',
      iban: 'any-iban',
      email: 'any-email',
      groups: undefined,
      compensationClasses: [],
    } as any as UserDto;
    const { unmount } = render(
      <Profile
        user={user}
        courses={[]}
        handleEditIbanClick={() => {}}
        accessToken={'123'}
      />,
    );

    const groupField = screen.getByTestId('profile-groups-textfield');
    // @ts-ignore IntelliJ thinks that value does not exist
    expect(groupField.value).toBe('Keine Gruppen');
    unmount();
  });
});
