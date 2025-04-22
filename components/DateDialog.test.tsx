/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import DateDialog from './DateDialog';

import dayjs from 'dayjs';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import 'dayjs/locale/de';
import userEvent from '@testing-library/user-event';
import {
  FIRST_DAY_OF_PREVIOUS_QUARTER,
  FIRST_DAY_OF_THIS_QUARTER,
  LAST_DAY_OF_PREVIOUS_QUARTER,
  LAST_DAY_OF_THIS_QUARTER,
} from '@/lib/helpers-for-date';
import { fillDatePicker, verifyDatePickerValue } from '@/lib/testHelpers';

const options = [
  {
    label: 'Letztes Quartal',
    start: FIRST_DAY_OF_PREVIOUS_QUARTER,
    end: LAST_DAY_OF_PREVIOUS_QUARTER,
  },
  {
    label: 'Aktuelles Quartal',
    start: FIRST_DAY_OF_THIS_QUARTER,
    end: LAST_DAY_OF_THIS_QUARTER,
  },
];

describe('DateDialog', () => {
  test('Shows header', async () => {
    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <DateDialog
          open={true}
          onClose={vi.fn()}
          startDate={dayjs()}
          endDate={dayjs()}
          setStartDate={vi.fn()}
          setEndDate={vi.fn()}
          options={options}
        />
      </LocalizationProvider>,
    );
    await screen.findByText('Anzeigezeitraum wählen');
    unmount();
  });

  test('Closes on abbrechen', async () => {
    const handleClose = vi.fn();
    const setStartDate = vi.fn();
    const setEndDate = vi.fn();
    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <DateDialog
          open={true}
          onClose={handleClose}
          startDate={dayjs()}
          endDate={dayjs()}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          options={options}
        />
      </LocalizationProvider>,
    );
    const cancel = await screen.findByRole('button', { name: /abbrechen/i });

    fireEvent.click(cancel);
    expect(handleClose).toHaveBeenCalled();
    expect(setStartDate).not.toHaveBeenCalled();
    expect(setEndDate).not.toHaveBeenCalled();
    unmount();
  });

  test('Sets date on custom timeframe', async () => {
    const handleClose = vi.fn();
    const setStartDate = vi.fn();
    const setEndDate = vi.fn();

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <DateDialog
          open={true}
          onClose={handleClose}
          startDate={dayjs()}
          endDate={dayjs()}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          options={options}
        />
      </LocalizationProvider>,
    );

    const customTimeframeRadio = await screen.findByLabelText('Start / Ende');
    await userEvent.click(customTimeframeRadio);

    await fillDatePicker('Start', dayjs('2023-05-04'));
    await fillDatePicker('Ende', dayjs('2024-06-05'));

    const saveButton = await screen.findByRole('button', {
      name: /Bestätigen/i,
    });

    await waitFor(() => {
      fireEvent.click(saveButton);
    });

    expect(handleClose).toHaveBeenCalled();

    const startDate = setStartDate.mock.calls[0][0] as dayjs.Dayjs;
    expect(startDate.isSame(dayjs('2023-05-04')));

    const endDate = setEndDate.mock.calls[0][0] as dayjs.Dayjs;
    expect(endDate.isSame(dayjs('2024-06-05')));

    unmount();
  });

  test('Sets to current quarter', async () => {
    const setStartDate = vi.fn();
    const setEndDate = vi.fn();

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <DateDialog
          open={true}
          onClose={vi.fn()}
          startDate={dayjs()}
          endDate={dayjs()}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          options={options}
        />
      </LocalizationProvider>,
    );

    const currentQuarterRadio =
      await screen.findByLabelText('Aktuelles Quartal');
    await userEvent.click(currentQuarterRadio);

    const saveButton = await screen.findByRole('button', {
      name: /Bestätigen/i,
    });
    await waitFor(() => {
      fireEvent.click(saveButton);
    });

    const startDate = setStartDate.mock.calls[0][0] as dayjs.Dayjs;
    expect(startDate.isSame(FIRST_DAY_OF_THIS_QUARTER, 'days'));
    const endDate = setEndDate.mock.calls[0][0] as dayjs.Dayjs;
    expect(endDate.isSame(LAST_DAY_OF_THIS_QUARTER, 'days'));

    unmount();
  });

  test('Sets to previous quarter', async () => {
    const setStartDate = vi.fn();
    const setEndDate = vi.fn();

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <DateDialog
          open={true}
          onClose={vi.fn()}
          startDate={dayjs()}
          endDate={dayjs()}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
          options={options}
        />
      </LocalizationProvider>,
    );

    const previousQuarterRadio =
      await screen.findByLabelText('Aktuelles Quartal');
    await userEvent.click(previousQuarterRadio);

    const saveButton = await screen.findByRole('button', {
      name: /Bestätigen/i,
    });
    await waitFor(() => {
      fireEvent.click(saveButton);
    });

    const startDate = setStartDate.mock.calls[0][0] as dayjs.Dayjs;
    expect(startDate.isSame(FIRST_DAY_OF_PREVIOUS_QUARTER, 'days'));
    const endDate = setEndDate.mock.calls[0][0] as dayjs.Dayjs;
    expect(endDate.isSame(LAST_DAY_OF_PREVIOUS_QUARTER, 'days'));

    unmount();
  });

  test('Updates timestamps when last quarter is selected', async () => {
    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <DateDialog
          open={true}
          onClose={vi.fn()}
          startDate={dayjs()}
          endDate={dayjs()}
          setStartDate={vi.fn()}
          setEndDate={vi.fn()}
          options={options}
        />
      </LocalizationProvider>,
    );

    // WHEN
    const previousQuarterRadio =
      await screen.findByLabelText('Letztes Quartal');
    await userEvent.click(previousQuarterRadio);

    await verifyDatePickerValue('Start', FIRST_DAY_OF_PREVIOUS_QUARTER);
    await verifyDatePickerValue('Ende', LAST_DAY_OF_PREVIOUS_QUARTER);

    unmount();
  });

  test('Updates timestamps when current quarter is selected', async () => {
    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <DateDialog
          open={true}
          onClose={vi.fn()}
          startDate={dayjs()}
          endDate={dayjs()}
          setStartDate={vi.fn()}
          setEndDate={vi.fn()}
          options={options}
        />
      </LocalizationProvider>,
    );

    // WHEN
    const previousQuarterRadio =
      await screen.findByLabelText('Letztes Quartal');
    await userEvent.click(previousQuarterRadio);
    const currentQuarterRadio =
      await screen.findByLabelText('Aktuelles Quartal');
    await userEvent.click(currentQuarterRadio);

    await verifyDatePickerValue('Start', FIRST_DAY_OF_THIS_QUARTER);
    await verifyDatePickerValue('Ende', LAST_DAY_OF_THIS_QUARTER);

    unmount();
  });
});
