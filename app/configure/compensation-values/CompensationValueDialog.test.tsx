/**
 * @jest-environment jsdom
 */

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import React from 'react';
import CompensationValueDialog from '@/app/configure/compensation-values/CompensationValueDialog';
import userEvent from '@testing-library/user-event';

describe('compensation value dialog', () => {
  test('Can enter integer values for cents', async () => {
    const save = jest.fn();
    const close = jest.fn();
    render(
      <CompensationValueDialog
        open={true}
        handleClose={close}
        handleSave={save}
        toEdit={null}
      />);

    const centsTextBox = await screen.findByRole('textbox', { name: 'Betrag' });
    await userEvent.type(centsTextBox!, '24');
    expect(centsTextBox).toHaveValue('24');


    const nameTextBox = await screen.findByRole('textbox', { name: 'Bezeichnung' });
    await userEvent.type(nameTextBox!, 'name');

    const durationTextBox = await screen.findByRole('spinbutton', { name: /dauer.*/i });
    await userEvent.type(durationTextBox!, '120');

    const saveButton = await screen.findByRole('button', { name: /Speichern/i });
    expect(saveButton).toBeEnabled();
    fireEvent.submit(saveButton);

    await waitFor(() => expect(save).toHaveBeenCalledWith({
      cents: 2400,
      description: 'name',
      durationMinutes: 120,
    }));
  });
});