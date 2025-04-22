/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { HolidayDialog } from '@/app/configure/holidays/HolidayDialog';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers';
import 'dayjs/locale/de';
import dayjs from 'dayjs';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import { fillDatePicker } from '@/lib/testHelpers';

async function clickSave() {
  const saveButton = await screen.findByRole('button', {
    name: /Speichern/i,
  });
  await act(async () => {
    fireEvent.click(saveButton!);
  });
}

describe('EnterHolidayDialog', () => {
  test('name must be entered', async () => {
    const handleSave = vi.fn();

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <HolidayDialog
          open={true}
          handleClose={vi.fn()}
          handleSave={handleSave}
          toEdit={null}
        />
        ,
      </LocalizationProvider>,
    );

    await clickSave();

    expect(handleSave).not.toHaveBeenCalled();
    unmount();
  });

  test('happy case', async () => {
    const handleSave = vi.fn();
    const startDate = '2024-10-22';
    const endDate = '2024-10-29';
    const name = 'any-name';

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <HolidayDialog
          open={true}
          handleClose={vi.fn()}
          handleSave={handleSave}
          toEdit={null}
        />
        ,
      </LocalizationProvider>,
    );

    await fillDatePicker('Start', dayjs(startDate));
    await fillDatePicker('Ende', dayjs(endDate));

    const nameTextBox = await screen.findByRole('textbox', {
      name: 'Beschreibung',
    });
    await userEvent.type(nameTextBox, name);

    await clickSave();

    expect(handleSave).toHaveBeenCalledWith({
      start: startDate,
      end: endDate,
      name,
    });
    unmount();
  });

  test('start cannot be before end', async () => {
    const handleSave = vi.fn();
    const startDate = '2024-10-29';
    const endDate = '2024-10-22';
    const name = 'any-name';

    const { unmount } = render(
      <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="de">
        <HolidayDialog
          open={true}
          handleClose={vi.fn()}
          handleSave={handleSave}
          toEdit={null}
        />
        ,
      </LocalizationProvider>,
    );

    await fillDatePicker('Start', dayjs(startDate));
    await fillDatePicker('Ende', dayjs(endDate));

    const nameTextBox = await screen.findByRole('textbox', {
      name: 'Beschreibung',
    });
    await userEvent.type(nameTextBox, name);

    await act(async () => {
      await clickSave();
    });

    expect(handleSave).not.toHaveBeenCalled();
    unmount();
  });
});
