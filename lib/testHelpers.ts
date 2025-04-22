import dayjs from 'dayjs';
import userEvent from '@testing-library/user-event';
import { screen, within } from '@testing-library/react';
import { expect } from 'vitest';

export async function fillDatePicker(label: string, value: dayjs.Dayjs) {
  const dateGroup = screen.getByRole('group', { name: label });
  await userEvent.type(
    within(dateGroup).getByRole('spinbutton', { name: /Year/i }),
    value.format('YYYY'),
  );
  await userEvent.type(
    within(dateGroup).getByRole('spinbutton', { name: /Month/i }),
    value.format('MM'),
  );
  await userEvent.type(
    within(dateGroup).getByRole('spinbutton', { name: /Day/i }),
    value.format('DD'),
  );
}

export async function verifyDatePickerValue(
  label: string,
  expected: dayjs.Dayjs,
) {
  const dateGroup = screen.getByRole('group', { name: label });
  expect(
    within(dateGroup).getByRole('spinbutton', { name: /Year/ }),
  ).toHaveValue(parseInt(expected.format('YYYY')));
  expect(
    within(dateGroup).getByRole('spinbutton', { name: /Month/ }),
  ).toHaveValue(parseInt(expected.format('MM')));
  expect(
    within(dateGroup).getByRole('spinbutton', { name: /Day/ }),
  ).toHaveValue(parseInt(expected.format('DD')));
}
