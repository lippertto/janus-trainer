/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import TrainingDialog from '@/app/enter/TrainingDialog';
import userEvent from '@testing-library/user-event';
import { DayOfWeek } from '@prisma/client';
import { CompensationValueDto, CourseLight, TrainingDto } from '@/lib/dto';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import 'dayjs/locale/de';
import { LocalizationProvider } from '@mui/x-date-pickers';
import dayjs from 'dayjs';


const COURSES: CourseLight[] = [
  { id: 19, name: 'course-1', weekdays: [DayOfWeek.THURSDAY], startMinute: 0, startHour: 19, durationMinutes: 60 },
  { id: 20, name: 'course-2', weekdays: [DayOfWeek.FRIDAY], startMinute: 0, startHour: 19, durationMinutes: 90 },
  { id: 21, name: 'course-3', weekdays: [DayOfWeek.MONDAY], startMinute: 0, startHour: 19, durationMinutes: 120 },
];

const COMPENSATION_VALUES: CompensationValueDto[] = [
  {
    id: 5,
    durationMinutes: 60,
    description: '',
    cents: 300,
    compensationGroup: 'WITH_QUALIFICATION',
    compensationClassId: 1,
  },
  {
    id: 6,
    durationMinutes: 90,
    description: '',
    cents: 400,
    compensationGroup: 'WITH_QUALIFICATION',
    compensationClassId: 1,
  },
  {
    id: 7,
    durationMinutes: 120,
    description: '',
    cents: 500,
    compensationGroup: 'WITH_QUALIFICATION',
    compensationClassId: 1,
  },
];

// set date to a value in 'DD.MM.YYYY' format. If not set, will use today
async function setDate(value: string | null = null) {
  const datepickerTextBox = await screen.findByRole('textbox', { name: 'Datum' });
  const valueOrToday = value ? dayjs(value, 'DD.MM.YYYY') : dayjs();
  let valueToEnter = valueOrToday.format('DD.MM.YYYY');
  await userEvent.type(datepickerTextBox!, valueToEnter);
  expect(datepickerTextBox).toHaveValue(valueToEnter);
}

async function setParticipantCount(value: number | null = null) {
  const valueToType = value !== null ? value : 100;
  const participantCountTextBox = await screen.findByRole('spinbutton', { name: /Anzahl.*/i });
  await userEvent.type(participantCountTextBox!, valueToType.toString());
  expect(participantCountTextBox).toHaveValue(valueToType);
}

async function pressSave() {
  const saveButton = await screen.findByRole('button', { name: /Speichern/i });
  expect(saveButton).toBeEnabled();
  fireEvent.submit(saveButton);
}

test('happy case', async () => {
  const save = jest.fn();
  const close = jest.fn();

  const userId = 'userId123';

  render(
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
      <TrainingDialog
        open={true}
        handleClose={close}
        handleSave={save}
        handleDelete={jest.fn()}
        toEdit={null}
        today={DayOfWeek.MONDAY}
        courses={COURSES}
        compensationValues={COMPENSATION_VALUES}
        userId={userId}
      />
    </LocalizationProvider>,
  );

  const comment = 'any-comment';
  const commentTextBox = await screen.findByRole('textbox', { name: 'Kommentar' });
  await userEvent.type(commentTextBox!, comment);
  expect(commentTextBox).toHaveValue(comment);

  await setDate('03.10.2024');
  const participantCount = 12;
  await setParticipantCount(participantCount);

  await pressSave();

  await waitFor(() => expect(save).toHaveBeenCalledWith({
    comment: comment,
    courseId: 21, // we want this to be auto-selected based on the day
    compensationCents: 500,  // we want this to be auto-selected based on the duration
    date: '2024-10-03',
    participantCount: participantCount,
    userId: userId,
  }));
});

test('selects matching compensation value when course changes', async () => {
  const save = jest.fn();
  const close = jest.fn();

  render(
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
      <TrainingDialog
        open={true}
        handleClose={close}
        handleSave={save}
        handleDelete={jest.fn()}
        toEdit={null}
        today={DayOfWeek.MONDAY}
        courses={COURSES}
        compensationValues={COMPENSATION_VALUES}
        userId={'userId123'}
      />
    </LocalizationProvider>,
  );

  await setDate();
  await setParticipantCount();

  // move one value down in the combobox
  const courseBox = await screen.findByRole('combobox', { name: /Kurs.*/i });
  act(() => {
    courseBox.focus();
  });
  fireEvent.keyDown(courseBox, { key: 'ArrowDown' });
  fireEvent.keyDown(courseBox, { key: 'ArrowDown' });
  fireEvent.keyDown(courseBox, { key: 'Enter' });

  await pressSave();

  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({
    userId: 'userId123',
  })));
});

test('Sets values from toEdit as defaults', async () => {
  const cents = COMPENSATION_VALUES[1].cents;
  const toEdit = {
    comment: 'comment', date: '2024-01-02', participantCount: 7, compensationCents:
    cents, course: COURSES[0],
  } as TrainingDto;
  const save = jest.fn();
  const close = jest.fn();

  // first render with toEdit=null. This is what happens in the app.
  const { rerender } = render(
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
      <TrainingDialog
        open={true}
        handleClose={close}
        handleSave={save}
        handleDelete={jest.fn()}
        toEdit={null}
        today={DayOfWeek.MONDAY}
        courses={COURSES}
        compensationValues={COMPENSATION_VALUES}
        userId={'userId123'}
      />
    </LocalizationProvider>,
  );

  // then update with the actual toEdit value.
  rerender(
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
      <TrainingDialog
        open={true}
        handleClose={close}
        handleSave={save}
        handleDelete={jest.fn()}
        toEdit={toEdit}
        today={DayOfWeek.MONDAY}
        courses={COURSES}
        compensationValues={COMPENSATION_VALUES}
        userId={'userId123'}
      />
    </LocalizationProvider>,
  );

  const participantCountTextBox = await screen.findByRole('spinbutton', { name: /Anzahl.*/i });
  expect(participantCountTextBox).toHaveValue(toEdit.participantCount);

  await pressSave();

  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({
    userId: 'userId123',
    date: '2024-01-02',
    compensationCents: cents,
    comment: 'comment',
    courseId: toEdit.course!.id,
    participantCount: toEdit.participantCount,
  })));
});

test('add new compensation value when no corresponding exists', async () => {
  const save = jest.fn();
  const close = jest.fn();

  const compensationValues: CompensationValueDto[] = [{
    compensationGroup: 'WITH_QUALIFICATION',
    compensationClassId: 1,
    cents: 300,
    description: 'desc',
    id: 1,
    durationMinutes: 120,
  }];
  const toEdit = {
    comment: 'comment', date: '2024-01-02', participantCount: 7, compensationCents:
      399, course: COURSES[0],
  } as TrainingDto;

  // first render with null
  const { rerender } = render(
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
      <TrainingDialog
        open={true}
        handleClose={close}
        handleSave={save}
        handleDelete={jest.fn()}
        toEdit={null}
        today={DayOfWeek.MONDAY}
        courses={COURSES}
        compensationValues={compensationValues}
        userId={'userId123'}
      />
    </LocalizationProvider>,
  );
  // then render with toEdit
  rerender(
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
      <TrainingDialog
        open={true}
        handleClose={close}
        handleSave={save}
        handleDelete={jest.fn()}
        toEdit={toEdit}
        today={DayOfWeek.MONDAY}
        courses={COURSES}
        compensationValues={compensationValues}
        userId={'userId123'}
      />
    </LocalizationProvider>,
  );

  // for some reason, isValid is only checked after we check this field
  const participantCountTextBox = await screen.findByRole('spinbutton', { name: /Anzahl.*/i });
  expect(participantCountTextBox).toHaveValue(toEdit.participantCount);

  await pressSave();

  await waitFor(() => expect(save).toHaveBeenCalledWith(expect.objectContaining({
    compensationCents: 399,
  })));
});