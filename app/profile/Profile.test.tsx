/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Profile from '@/app/profile/Profile';
import { Group, UserDto } from '@/lib/dto';
import '@testing-library/jest-dom';

jest.mock('@/lib/shared-queries', () => {
  return {
    __esModule: true,
    yearlyTotalsSuspenseQuery: jest.fn(() =>
      ({
        data:
          [{
            trainerId: 'miau',
            trainingCountQ1: 0,
            trainingCountQ2: 0,
            trainingCountQ3: 0,
            trainingCountQ4: 0,
            trainingCountTotal: 0,
            compensationCentsQ1: 0,
            compensationCentsQ2: 0,
            compensationCentsQ3: 0,
            compensationCentsQ4: 0,
            compensationCentsTotal: 0,
          },
          ],
      }),
    ),
    termsOfServiceSuspenseQuery: jest.fn(() => ("")),
    default:
      jest.fn(() => 'mocked baz'),
  }
    ;
});

// https://github.com/remarkjs/react-markdown/issues/635#issuecomment-991137447
jest.mock("react-markdown", () => (props: {children: React.ReactNode}) => {
  return <>{props.children}</>
})

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
  render(<Profile
    user={user}
    courses={[]}
    handleEditIbanClick={() => {
    }}
    accessToken="123"
  />);

  const groupField = screen.getByTestId('profile-groups-textfield');
  // @ts-ignore IntelliJ thinks that value does not exist
  expect(groupField.value).toBe('Administration');
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
  render(<Profile
    user={user}
    courses={[]}
    handleEditIbanClick={() => {
    }}
    accessToken={'123'}
  />);

  const groupField = screen.getByTestId('profile-groups-textfield');
  // @ts-ignore IntelliJ thinks that value does not exist
  expect(groupField.value).toBe('Keine Gruppen');
});