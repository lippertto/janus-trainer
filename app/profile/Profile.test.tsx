/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Profile from '@/app/profile/Profile';
import { Group, UserDto } from '@/lib/dto';
import "@testing-library/jest-dom";


test('happy case: handles groups', async () => {
  const user: UserDto = {
    id: 'any-id',
    name: 'any-name',
    iban: 'any-iban',
    email: 'any-email',
    groups: [Group.ADMINS],
    compensationGroups: [],
  };
  render(<Profile
    user={user}
    courses={[]}
    handleEditIbanClick={() => {
    }}
  />);

  const groupField = screen.getByTestId('profile-groups-textfield');
  // @ts-ignore IntelliJ thinks that value does not exist
  expect(groupField.value).toBe("Administratoren")
});

test('handles missing groups', async () => {
  const user: UserDto = {
    id: 'any-id',
    name: 'any-name',
    iban: 'any-iban',
    email: 'any-email',
    groups: undefined,
    compensationGroups: [],
  } as any as UserDto;
  render(<Profile
    user={user}
    courses={[]}
    handleEditIbanClick={() => {
    }}
  />);

  const groupField = screen.getByTestId('profile-groups-textfield');
  // @ts-ignore IntelliJ thinks that value does not exist
  expect(groupField.value).toBe("Keine Gruppen")
});