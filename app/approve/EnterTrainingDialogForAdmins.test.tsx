/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { CourseDto, UserDto } from '@/lib/dto';
import 'dayjs/locale/de';
import { EnterTrainingDialogForAdmins } from '@/app/approve/EnterTrainingDialogForAdmins';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import userEvent from '@testing-library/user-event';

const TRAINERS: Pick<UserDto, 'id' | 'name'>[] = [
  { id: '123', name: 'Trainer A' },
  { id: '456', name: 'Trainer B' },
];

const COURSES: Pick<CourseDto, 'id' | 'name'>[] = [
  { id: 123, name: 'Course A 1' },
  { id: 124, name: 'Course A 2' },
  { id: 125, name: 'Course B 1' },
];

const getCourses = jest.fn((tid: string | null) => {
  if (!tid) return [];
  if (tid === '123') {
    return COURSES.slice(0, 2);
  } else {
    return COURSES.slice(2, 3);
  }
});

describe('EnterTrainingDialogForAdmins', () => {
  test('renders properly', async () => {
    const getTrainers = jest.fn(() => TRAINERS);

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <EnterTrainingDialogForAdmins
          open={true}
          getTrainers={getTrainers}
          getCourses={getCourses}
          handleConfirm={jest.fn()}
          handleClose={jest.fn()}
        />
      </LocalizationProvider>,
    );

    await screen.findByText('Training hinzufügen');

    const dateBox = await screen.findByRole('textbox', { name: 'Datum' });
    expect(dateBox).toHaveValue(dayjs().format('DD.MM.YYYY'));

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
    const getTrainers = jest.fn(() => TRAINERS);

    const handleConfirm = jest.fn();

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <EnterTrainingDialogForAdmins
          open={true}
          getTrainers={getTrainers}
          getCourses={getCourses}
          handleConfirm={handleConfirm}
          handleClose={jest.fn()}
        />
      </LocalizationProvider>,
    );

    await fillOutForm({
      date: '03.10.2024',
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
    const handleConfirm = jest.fn();

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <EnterTrainingDialogForAdmins
          open={true}
          getTrainers={jest.fn(() => TRAINERS)}
          getCourses={getCourses}
          handleConfirm={handleConfirm}
          handleClose={jest.fn()}
        />
      </LocalizationProvider>,
    );

    await fillOutForm({
      date: '03.10.2024',
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
  date: string;
  comment: string;
  amount: string;
}) {
  const dateBox = await screen.findByRole('textbox', { name: 'Datum' });
  await userEvent.type(dateBox, '03.10.2024');

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