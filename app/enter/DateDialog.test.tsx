/**
 * @jest-environment jsdom
 */

import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';

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

describe('DateDialog', () => {
  test('Shows header', async () => {
    render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <DateDialog
          open={true}
          onClose={jest.fn()}
          startDate={dayjs()}
          endDate={dayjs()}
          setStartDate={jest.fn()}
          setEndDate={jest.fn()}
        />
      </LocalizationProvider>,
    );
    await screen.findByText('Anzeigezeitraum wählen');
  });

  test('Closes on abbrechen', async () => {
    const handleClose = jest.fn();
    const setStartDate = jest.fn();
    const setEndDate = jest.fn();
    render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <DateDialog
          open={true}
          onClose={handleClose}
          startDate={dayjs()}
          endDate={dayjs()}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
      </LocalizationProvider>,
    );
    const cancel = await screen.findByRole('button', { name: /abbrechen/i });

    fireEvent.click(cancel);
    expect(handleClose).toHaveBeenCalled();
    expect(setStartDate).not.toHaveBeenCalled();
    expect(setEndDate).not.toHaveBeenCalled();
  });

  test('Sets date on custom timeframe', async () => {
    const handleClose = jest.fn();
    const setStartDate = jest.fn();
    const setEndDate = jest.fn();

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <DateDialog
          open={true}
          onClose={handleClose}
          startDate={dayjs()}
          endDate={dayjs()}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
        />
      </LocalizationProvider>,
    );

    const customTimeframeRadio = await screen.findByLabelText('Start / Ende');
    await userEvent.click(customTimeframeRadio);

    const startDatepickerTextBox = await screen.findByRole('textbox', {
      name: 'Start',
    });
    const endDatepickerTextBox = await screen.findByRole('textbox', {
      name: 'Ende',
    });

    await userEvent.type(startDatepickerTextBox, '04.05.2023');
    await userEvent.type(endDatepickerTextBox, '05.06.2024');

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
    const setStartDate = jest.fn();
    const setEndDate = jest.fn();

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <DateDialog
          open={true}
          onClose={jest.fn()}
          startDate={dayjs()}
          endDate={dayjs()}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
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
    const setStartDate = jest.fn();
    const setEndDate = jest.fn();

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <DateDialog
          open={true}
          onClose={jest.fn()}
          startDate={dayjs()}
          endDate={dayjs()}
          setStartDate={setStartDate}
          setEndDate={setEndDate}
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
});
