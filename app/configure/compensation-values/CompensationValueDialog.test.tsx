/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import CompensationValueDialog from '@/app/configure/compensation-values/CompensationValueDialog';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

describe('compensation value dialog', () => {
  test('Can enter integer values for cents', async () => {
    const save = vi.fn();
    const close = vi.fn();
    render(
      <CompensationValueDialog
        open={true}
        handleClose={close}
        handleSave={save}
        toEdit={null}
      />,
    );

    const centsTextBox = await screen.findByRole('textbox', { name: 'Betrag' });
    await userEvent.type(centsTextBox!, '24');
    expect(centsTextBox).toHaveValue('24');

    const nameTextBox = await screen.findByRole('textbox', {
      name: 'Bezeichnung',
    });
    await userEvent.type(nameTextBox!, 'name');

    const durationTextBox = await screen.findByRole('spinbutton', {
      name: /dauer.*/i,
    });
    await userEvent.type(durationTextBox!, '120');

    const saveButton = await screen.findByRole('button', {
      name: /Speichern/i,
    });
    expect(saveButton).toBeEnabled();
    fireEvent.submit(saveButton);

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        cents: 2400,
        description: 'name',
        durationMinutes: 120,
      }),
    );
  });

  test('Can enter floating point values for cents', async () => {
    const save = vi.fn();
    const close = vi.fn();
    render(
      <CompensationValueDialog
        open={true}
        handleClose={close}
        handleSave={save}
        toEdit={null}
      />,
    );

    const centsTextBox = await screen.findByRole('textbox', { name: 'Betrag' });
    await userEvent.type(centsTextBox!, '32,13');
    expect(centsTextBox).toHaveValue('32,13');

    const nameTextBox = await screen.findByRole('textbox', {
      name: 'Bezeichnung',
    });
    await userEvent.type(nameTextBox!, 'name');

    const durationTextBox = await screen.findByRole('spinbutton', {
      name: /dauer.*/i,
    });
    await userEvent.type(durationTextBox!, '120');

    const saveButton = await screen.findByRole('button', {
      name: /Speichern/i,
    });
    expect(saveButton).toBeEnabled();
    fireEvent.submit(saveButton);

    await waitFor(() =>
      expect(save).toHaveBeenCalledWith({
        cents: 3213,
        description: 'name',
        durationMinutes: 120,
      }),
    );
  });
});
