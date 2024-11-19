/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { CourseDialog } from '@/app/offerings/courses/CourseDialog';
import { DisciplineDto, Group, UserDto } from '@/lib/dto';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { describe, expect, test, vi } from 'vitest';

import 'dayjs/locale/de';
import userEvent from '@testing-library/user-event';

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
];

const costCenters: DisciplineDto[] = [
  { id: 1, name: 'cost-center-01', costCenterId: 101 },
];

describe('CourseDialog', () => {
  test('Strips whitespaces from name when submitting', async () => {
    // also: tests happy case
    const handleSave = vi.fn();
    render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <CourseDialog
          open={true}
          handleClose={vi.fn()}
          handleSave={handleSave}
          trainers={trainers}
          costCenters={costCenters}
          courseToEdit={null}
        />
      </LocalizationProvider>,
    );

    const nameTextBox = await screen.findByRole('textbox', {
      name: /Name des Kurses/i,
    });
    await userEvent.type(nameTextBox, ' Test Kurs 01  ');

    const timeTextBox = await screen.findByRole('textbox', {
      name: /Uhrzeit/i,
    });
    await userEvent.type(timeTextBox, '19:00');

    const durationTextBox = await screen.findByRole('spinbutton', {
      name: /Dauer/i,
    });
    await userEvent.clear(durationTextBox);
    await userEvent.type(durationTextBox, '90');

    const trainerAutocomplete = await screen.findByRole('combobox', {
      name: /Übungsleitung/i,
    });
    act(() => {
      trainerAutocomplete.focus();
    });
    fireEvent.keyDown(trainerAutocomplete, { key: 'ArrowDown' });
    fireEvent.keyDown(trainerAutocomplete, { key: 'ArrowDown' });
    fireEvent.keyDown(trainerAutocomplete, { key: 'Enter' });

    const costCenterAutocomplete = await screen.findByRole('combobox', {
      name: /Kostenstelle/i,
    });
    act(() => {
      costCenterAutocomplete.focus();
    });
    fireEvent.keyDown(costCenterAutocomplete, { key: 'ArrowDown' });
    fireEvent.keyDown(costCenterAutocomplete, { key: 'ArrowDown' });
    fireEvent.keyDown(costCenterAutocomplete, { key: 'Enter' });

    const saveButton = await screen.findByRole('button', {
      name: /Speichern/i,
    });
    await userEvent.click(saveButton);

    expect(handleSave).toHaveBeenCalledWith({
      disciplineId: costCenters[0].id,
      durationMinutes: 90,
      startHour: 19,
      startMinute: 0,
      trainerIds: [trainers[0].id],
      weekdays: [],
      name: 'Test Kurs 01',
    });
  });
});
