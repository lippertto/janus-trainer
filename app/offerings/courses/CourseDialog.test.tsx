/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CourseDialog } from '@/app/offerings/courses/CourseDialog';
import { CostCenterDto, Group, UserDto } from '@/lib/dto';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { describe, expect, test, vi } from 'vitest';

import 'dayjs/locale/de';
import userEvent from '@testing-library/user-event';
import { DayOfWeek } from '@prisma/client';

const trainers: UserDto[] = [
  {
    id: 'user-id-01',
    email: 'user-email-01',
    iban: 'any-iban-01',
    name: 'user-name-01',
    groups: [Group.TRAINERS],
    termsAcceptedAt: null,
    termsAcceptedVersion: null,
  },
  {
    id: 'user-id-02',
    email: 'user-email-02',
    iban: 'any-iban-02',
    name: 'user-name-02',
    groups: [Group.TRAINERS],
    termsAcceptedAt: null,
    termsAcceptedVersion: null,
  },
];

const costCenters: CostCenterDto[] = [
  { id: 1, name: 'cost-center-01', costCenterId: 101, deletedAt: null },
];

async function fillTextBox(name: string, text: string) {
  const nameTextBox = await screen.findByRole('textbox', {
    name: new RegExp(name, 'i'),
  });
  await userEvent.type(nameTextBox, text);
}

async function selectNthComboboxElement(name: string, n: number) {
  const autocomplete = await screen.findByRole('combobox', {
    name: new RegExp(name, 'i'),
  });
  act(() => {
    autocomplete.focus();
  });
  fireEvent.keyDown(autocomplete, { key: 'ArrowDown' });
  for (let i = 0; i < n; i++) {
    fireEvent.keyDown(autocomplete, { key: 'ArrowDown' });
  }
  fireEvent.keyDown(autocomplete, { key: 'Enter' });
}

describe('CourseDialog', () => {
  test('Strips whitespaces from name when submitting', async () => {
    const handleSave = vi.fn();
    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <CourseDialog
          open={true}
          handleClose={vi.fn()}
          handleSave={handleSave}
          trainers={trainers}
          costCenters={costCenters}
          toEdit={null}
        />
      </LocalizationProvider>,
    );
    await fillTextBox('Name des Kurses', ' Test Kurs 01  ');

    const hours = screen.getByRole('spinbutton', { name: /Hours/i });
    await userEvent.type(hours, '19');

    const minutes = screen.getByRole('spinbutton', { name: /Minutes/i });
    await userEvent.type(minutes, '00');

    const durationTextBox = await screen.findByRole('spinbutton', {
      name: /Dauer/i,
    });
    await userEvent.clear(durationTextBox);
    await userEvent.type(durationTextBox, '90');

    await selectNthComboboxElement('Übungsleitung', 1);
    await selectNthComboboxElement('Kostenstelle', 1);

    const saveButton = await screen.findByRole('button', {
      name: /Speichern/i,
    });
    await userEvent.click(saveButton);

    expect(handleSave).toHaveBeenCalledWith({
      costCenterId: costCenters[0].id,
      durationMinutes: 90,
      startHour: 19,
      startMinute: 0,
      trainerIds: [trainers[0].id],
      weekday: null,
      name: 'Test Kurs 01',
    });

    unmount();
  });

  test('Can select multiple trainers', async () => {
    const handleSave = vi.fn();
    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <CourseDialog
          open={true}
          handleClose={vi.fn()}
          handleSave={handleSave}
          trainers={trainers}
          costCenters={costCenters}
          toEdit={null}
        />
      </LocalizationProvider>,
    );

    await fillTextBox('Name des Kurses', 'any-course');

    const hours = screen.getByRole('spinbutton', { name: /Hours/i });
    await userEvent.type(hours, '20');

    const minutes = screen.getByRole('spinbutton', { name: /Minutes/i });
    await userEvent.type(minutes, '15');

    const durationTextBox = await screen.findByRole('spinbutton', {
      name: /Dauer/i,
    });
    await userEvent.clear(durationTextBox);
    await userEvent.type(durationTextBox, '120');

    await selectNthComboboxElement('Übungsleitung', 1);
    await selectNthComboboxElement('Übungsleitung', 1); // this will select the 2nd trainer
    await selectNthComboboxElement('Kostenstelle', 1);
    await selectNthComboboxElement('Wochentag', 3);

    const saveButton = await screen.findByRole('button', {
      name: /Speichern/i,
    });
    await userEvent.click(saveButton);

    expect(handleSave).toHaveBeenCalledWith({
      costCenterId: costCenters[0].id,
      durationMinutes: 120,
      startHour: 20,
      startMinute: 15,
      trainerIds: [trainers[0].id, trainers[1].id],
      weekday: DayOfWeek.WEDNESDAY,
      name: 'any-course',
    });

    unmount();
  });
});
