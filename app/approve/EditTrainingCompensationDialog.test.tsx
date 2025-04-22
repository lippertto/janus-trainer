/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import EditTrainingCompensationDialog from '@/app/approve/EditTrainingCompensationDialog';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

async function fillTextBox(name: string, text: string) {
  const nameTextBox = await screen.findByRole('textbox', {
    name: new RegExp(name, 'i'),
  });
  await userEvent.clear(nameTextBox);
  await userEvent.type(nameTextBox, text);
}

describe('EditTrainingCompensationDialog', () => {
  test('Shows current values as expected', async () => {
    const handleConfirm = vi.fn();

    const { unmount } = render(
      <EditTrainingCompensationDialog
        open={true}
        onConfirm={handleConfirm}
        onClose={vi.fn()}
        currentCompensationCents={1234}
        courseName="Some Course"
        trainingDate="1023-04-05"
      />,
    );
    const compensationTextBox = screen.getByRole('textbox', {
      name: /Pauschale.*/i,
    });
    expect(compensationTextBox).toHaveValue('12,34');

    await fillTextBox('Pauschale', '45,67');
    await fillTextBox('Begründung', 'Eine Begründung');

    const saveButton = await screen.findByRole('button', { name: 'Speichern' });
    expect(saveButton).toBeEnabled();
    fireEvent.submit(saveButton);

    await waitFor(() =>
      expect(handleConfirm).toHaveBeenCalledWith(4567, 'Eine Begründung'),
    );

    unmount();
  });
});
