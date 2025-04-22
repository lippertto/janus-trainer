/**
 * @vitest-environment jsdom
 */

import React from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import TrainingDialog from '@/app/enter/TrainingDialog';
import { DayOfWeek, TrainingStatus } from '@prisma/client';
import { CompensationValueDto, CourseDto, TrainingDto } from '@/lib/dto';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import 'dayjs/locale/de';
import { LocalizationProvider } from '@mui/x-date-pickers';

import { describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';
import { fillDatePicker } from '@/lib/testHelpers';

const COURSES: CourseDto[] = [
  {
    id: 19,
    name: 'course-1',
    weekday: DayOfWeek.THURSDAY,
    startMinute: 0,
    startHour: 19,
    durationMinutes: 60,
  },
  {
    id: 20,
    name: 'course-2',
    weekday: DayOfWeek.FRIDAY,
    startMinute: 0,
    startHour: 19,
    durationMinutes: 90,
  },
  {
    id: 21,
    name: 'course-3',
    weekday: DayOfWeek.MONDAY,
    startMinute: 0,
    startHour: 19,
    durationMinutes: 120,
  },
] as CourseDto[];

const COMPENSATION_VALUES: CompensationValueDto[] = [
  {
    id: 5,
    durationMinutes: 60,
    description: '',
    cents: 300,
    compensationClassId: 1,
  },
  {
    id: 6,
    durationMinutes: 90,
    description: '',
    cents: 400,
    compensationClassId: 1,
  },
  {
    id: 7,
    durationMinutes: 120,
    description: '',
    cents: 500,
    compensationClassId: 1,
  },
];

function selectFirstComboboxElement(element: HTMLElement) {
  act(() => {
    element.focus();
  });
  fireEvent.keyDown(element, { key: 'ArrowDown' });
  fireEvent.keyDown(element, { key: 'ArrowDown' });
  fireEvent.keyDown(element, { key: 'Enter' });
}

async function setParticipantCount(value: number | null = null) {
  const valueToType = value !== null ? value : 100;
  const participantCountTextBox = await screen.findByRole('spinbutton', {
    name: /Anzahl.*/i,
  });
  await userEvent.type(participantCountTextBox!, valueToType.toString());
  expect(participantCountTextBox).toHaveValue(valueToType);
}

async function pressSave() {
  const saveButton = await screen.findByTestId('enter-training-save-button');
  expect(saveButton).toBeEnabled();
  fireEvent.submit(saveButton);
}

describe('enter courses', () => {
  test('happy case', async () => {
    const save = vi.fn();
    const close = vi.fn();

    const userId = 'userId123';

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <TrainingDialog
          open={true}
          handleClose={close}
          handleSave={save}
          handleDelete={vi.fn()}
          toEdit={null}
          today={DayOfWeek.MONDAY}
          courses={COURSES}
          compensationValues={COMPENSATION_VALUES}
          userId={userId}
          getCustomCourses={() => []}
        />
      </LocalizationProvider>,
    );

    const comment = 'any-comment';
    const commentTextBox = await screen.findByRole('textbox', {
      name: 'Kommentar',
    });
    await userEvent.type(commentTextBox!, comment);
    expect(commentTextBox).toHaveValue(comment);

    await fillDatePicker('Datum', dayjs('2024-10-03'));
    const participantCount = 12;
    await setParticipantCount(participantCount);

    await pressSave();

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        comment: comment,
        courseId: 21, // we want this to be auto-selected based on the day
        compensationCents: 500, // we want this to be auto-selected based on the duration
        date: '2024-10-03',
        participantCount: participantCount,
        userId: userId,
      }),
    );

    unmount();
  });

  test('selects matching compensation value when course changes', async () => {
    const save = vi.fn();
    const close = vi.fn();

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <TrainingDialog
          open={true}
          handleClose={close}
          handleSave={save}
          handleDelete={vi.fn()}
          toEdit={null}
          today={DayOfWeek.MONDAY}
          courses={COURSES}
          compensationValues={COMPENSATION_VALUES}
          userId={'userId123'}
          getCustomCourses={() => []}
        />
      </LocalizationProvider>,
    );

    await fillDatePicker('Datum', dayjs());
    await setParticipantCount();

    // move one value down in the combobox
    const courseBox = await screen.findByRole('combobox', { name: /Kurs.*/i });
    selectFirstComboboxElement(courseBox);

    await pressSave();

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'userId123',
        }),
      ),
    );

    unmount();
  });

  test('Sets values from toEdit as defaults', async () => {
    const cents = COMPENSATION_VALUES[1].cents;
    const toEdit = {
      comment: 'comment',
      date: '2024-01-02',
      participantCount: 7,
      compensationCents: cents,
      course: COURSES[0],
    } as TrainingDto;
    const save = vi.fn();
    const close = vi.fn();

    // first render with toEdit=null. This is what happens in the app.
    const { rerender, unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <TrainingDialog
          open={true}
          handleClose={close}
          handleSave={save}
          handleDelete={vi.fn()}
          toEdit={null}
          today={DayOfWeek.MONDAY}
          courses={COURSES}
          compensationValues={COMPENSATION_VALUES}
          userId={'userId123'}
          getCustomCourses={() => []}
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
          handleDelete={vi.fn()}
          toEdit={toEdit}
          today={DayOfWeek.MONDAY}
          courses={COURSES}
          compensationValues={COMPENSATION_VALUES}
          userId={'userId123'}
          getCustomCourses={() => []}
        />
      </LocalizationProvider>,
    );

    const participantCountTextBox = await screen.findByRole('spinbutton', {
      name: /Anzahl.*/i,
    });
    expect(participantCountTextBox).toHaveValue(toEdit.participantCount);

    await pressSave();

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'userId123',
          date: '2024-01-02',
          compensationCents: cents,
          comment: 'comment',
          courseId: toEdit.course!.id,
          participantCount: toEdit.participantCount,
        }),
      ),
    );

    unmount();
  });

  test('add new compensation value when no corresponding exists', async () => {
    const save = vi.fn();
    const close = vi.fn();

    const compensationValues: CompensationValueDto[] = [
      {
        compensationClassId: 1,
        cents: 300,
        description: 'desc',
        id: 1,
        durationMinutes: 120,
      },
    ];
    const toEdit = {
      comment: 'comment',
      date: '2024-01-02',
      participantCount: 7,
      compensationCents: 399,
      course: COURSES[0],
    } as TrainingDto;

    // first render with null
    const { rerender, unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <TrainingDialog
          open={true}
          handleClose={close}
          handleSave={save}
          handleDelete={vi.fn()}
          toEdit={null}
          today={DayOfWeek.MONDAY}
          courses={COURSES}
          compensationValues={compensationValues}
          userId={'userId123'}
          getCustomCourses={() => []}
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
          handleDelete={vi.fn()}
          toEdit={toEdit}
          today={DayOfWeek.MONDAY}
          courses={COURSES}
          compensationValues={compensationValues}
          userId={'userId123'}
          getCustomCourses={() => []}
        />
      </LocalizationProvider>,
    );

    // for some reason, isValid is only checked after we check this field
    const participantCountTextBox = await screen.findByRole('spinbutton', {
      name: /Anzahl.*/i,
    });
    expect(participantCountTextBox).toHaveValue(toEdit.participantCount);

    await pressSave();

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          compensationCents: 399,
        }),
      ),
    );

    unmount();
  });
});

describe('enter custom', () => {
  test('happy case', async () => {
    const save = vi.fn().mockName('handleSave mock');
    const userId = 'user-id';

    const customCourses = [
      {
        id: 1,
        name: 'B custom course 1',
      },
      {
        id: 2,
        name: 'A custom course 2',
      },
    ] as CourseDto[];

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <TrainingDialog
          open={true}
          handleClose={vi.fn()}
          handleSave={save}
          handleDelete={vi.fn()}
          toEdit={null}
          today={DayOfWeek.MONDAY}
          courses={COURSES}
          compensationValues={COMPENSATION_VALUES}
          userId={userId}
          getCustomCourses={() => customCourses}
        />
      </LocalizationProvider>,
    );

    const toggleButton = await screen.findByRole('button', { name: /einmal/i });
    expect(fireEvent.click(toggleButton)).toBe(true);

    const courseBox = await screen.findByRole('combobox', {
      name: /Kostenstelle/i,
    });
    selectFirstComboboxElement(courseBox);

    const comment = 'any-comment';
    const commentTextBox = screen.getByTestId(
      'training-dialog-custom-comment-field',
    );
    fireEvent.change(commentTextBox, { target: { value: comment } });

    const valueTextbox = screen.getByTestId(
      'training-dialog-custom-amount-field',
    );
    fireEvent.change(valueTextbox, { target: { value: '30,40' } });

    await pressSave();

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(
        expect.objectContaining({
          courseId: 2, // with sorting, this should be the first entry
          comment,
          compensationCents: 3040,
          date: dayjs().format('YYYY-MM-DD'),
          participantCount: 0,
          userId,
        }),
      ),
    );

    unmount();
  });

  test('happy edit case', async () => {
    const save = vi.fn().mockName('handleSave mock');
    const userId = 'user-id';

    const customCourses = [
      {
        id: 1,
        name: 'B custom course 1',
        isCustomCourse: true,
      },
      {
        id: 2,
        name: 'A custom course 2',
        isCustomCourse: true,
      },
    ] as CourseDto[];

    const toEdit: TrainingDto = {
      id: 5,
      status: TrainingStatus.NEW,
      date: '2020-01-02',
      compensationCents: 3456,
      participantCount: 0,
      courseId: customCourses[0].id,
      course: customCourses[0],
      userId: 'abc',
      paymentId: null,
      comment: 'some comment',
    };

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <TrainingDialog
          open={true}
          handleClose={vi.fn()}
          handleSave={vi.fn()}
          handleDelete={vi.fn()}
          toEdit={toEdit}
          today={DayOfWeek.MONDAY}
          courses={COURSES}
          compensationValues={COMPENSATION_VALUES}
          userId={userId}
          getCustomCourses={() => customCourses}
        />
      </LocalizationProvider>,
    );

    const commentTextBox = await screen.findByRole('textbox', {
      name: 'Kommentar',
    });
    expect(commentTextBox).toHaveValue(toEdit.comment);

    const valueTextbox = await screen.findByRole('textbox', {
      name: 'Betrag',
    });
    expect(valueTextbox).toHaveValue('34,56');

    unmount();
  });

  test('Shows explanation when no compensation groups have been assigned.', async () => {
    const userId = 'userId123';

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <TrainingDialog
          open={true}
          handleClose={vi.fn()}
          handleSave={vi.fn()}
          handleDelete={vi.fn()}
          toEdit={null}
          today={DayOfWeek.MONDAY}
          courses={COURSES}
          compensationValues={[]}
          userId={userId}
          getCustomCourses={() => []}
        />
      </LocalizationProvider>,
    );

    unmount();
  });
});
