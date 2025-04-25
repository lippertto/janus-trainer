/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { CourseDto, UserDto } from '@/lib/dto';
import { EnterTrainingDialogForAdmins } from '@/app/approve/EnterTrainingDialogForAdmins';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import 'dayjs/locale/de';

import { describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';

import userEvent from '@testing-library/user-event';
import { fillDatePicker, verifyDatePickerValue } from '@/lib/testHelpers';

const TRAINERS: Pick<UserDto, 'id' | 'name'>[] = [
  { id: '123', name: 'Trainer A' },
  { id: '456', name: 'Trainer B' },
];

const COURSES: Pick<CourseDto, 'id' | 'name'>[] = [
  { id: 123, name: 'Course A 1' },
  { id: 124, name: 'Course A 2' },
  { id: 125, name: 'Course B 1' },
];

const getCourses = vi.fn((tid: string | null) => {
  if (!tid) return [];
  if (tid === '123') {
    return COURSES.slice(0, 2);
  } else {
    return COURSES.slice(2, 3);
  }
});

describe('EnterTrainingDialogForAdmins', () => {
  test('renders properly', async () => {
    const getTrainers = vi.fn(() => TRAINERS);

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <EnterTrainingDialogForAdmins
          open={true}
          getTrainers={getTrainers}
          getCourses={getCourses}
          handleConfirm={vi.fn()}
          handleClose={vi.fn()}
        />
      </LocalizationProvider>,
    );

    await screen.findByText('Training hinzufügen');

    await verifyDatePickerValue('Datum', dayjs());

    await screen.findByRole('combobox', { name: 'Übungsleitung' });
    await screen.findByRole('combobox', { name: /Kurs.*/i });
    await screen.findByRole('textbox', { name: /Betrag.*/i });

    const participantCountTextBox = await screen.findByRole('spinbutton', {
      name: /Anzahl.*/i,
    });
    expect(participantCountTextBox).toHaveValue(null);

    await screen.findByRole('textbox', { name: 'Kommentar' });

    await screen.findByRole('button', { name: 'Abbrechen' });
    await screen.findByRole('button', { name: 'Speichern' });

    unmount();
  });

  test('Selection happy case', async () => {
    const getTrainers = vi.fn(() => TRAINERS);

    const handleConfirm = vi.fn();

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <EnterTrainingDialogForAdmins
          open={true}
          getTrainers={getTrainers}
          getCourses={getCourses}
          handleConfirm={handleConfirm}
          handleClose={vi.fn()}
        />
      </LocalizationProvider>,
    );

    await fillOutForm({
      date: dayjs('2024-10-03'),
      comment: 'comment',
      amount: '49,99',
    });

    await pressSave();

    await waitFor(() =>
      expect(handleConfirm).toHaveBeenCalledWith({
        comment: 'comment',
        compensationCents: 4999,
        courseId: 123, // first in list
        date: '2024-10-03',
        participantCount: 0,
        userId: '123', // first in list
      }),
    );

    unmount();
  });

  test('allows to enter negative values for amount', async () => {
    const handleConfirm = vi.fn();

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <EnterTrainingDialogForAdmins
          open={true}
          getTrainers={vi.fn(() => TRAINERS)}
          getCourses={getCourses}
          handleConfirm={handleConfirm}
          handleClose={vi.fn()}
        />
      </LocalizationProvider>,
    );

    await fillOutForm({
      date: dayjs('2024-10-03'),
      comment: 'some-comment',
      amount: '-10',
    });

    await pressSave();

    await waitFor(() =>
      expect(handleConfirm).toHaveBeenCalledWith(
        expect.objectContaining({
          compensationCents: -1000,
        }),
      ),
    );

    unmount();
  });
});

function selectFirstComboboxElement(element: HTMLElement) {
  act(() => {
    element.focus();
  });
  fireEvent.keyDown(element, { key: 'ArrowDown' });
  fireEvent.keyDown(element, { key: 'ArrowDown' });
  fireEvent.keyDown(element, { key: 'Enter' });
}

async function fillOutForm({
  date,
  comment,
  amount,
}: {
  date: dayjs.Dayjs;
  comment: string;
  amount: string;
}) {
  await fillDatePicker('Datum', dayjs(date));

  const trainerInput = await screen.findByText('Übungsleitung');
  selectFirstComboboxElement(trainerInput);

  const courseInput = await screen.findByRole('combobox', {
    name: /Kurs.*/i,
  });
  selectFirstComboboxElement(courseInput);

  const commentBox = await screen.findByRole('textbox', {
    name: 'Kommentar',
  });
  await userEvent.type(commentBox, comment);

  const amountBox = await screen.findByRole('textbox', { name: /Betrag.*/i });
  await userEvent.type(amountBox, amount);
}

async function pressSave() {
  const saveButton = await screen.findByRole('button', { name: 'Speichern' });
  fireEvent.submit(saveButton);
}
