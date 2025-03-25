/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { CostCenterDialog } from '@/app/offerings/cost-centers/CostCenterDialog';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';

describe('CostCenterDialog', () => {
  test('Can not save when number has already been assigned', async () => {
    const handleSave = vi.fn();

    const { unmount } = render(
      <CostCenterDialog
        open={true}
        toEdit={null}
        handleClose={vi.fn()}
        handleSave={handleSave}
        assignedNumbers={[1]}
      />,
    );

    const saveButton = await screen.findByRole('button', { name: 'Speichern' });
    fireEvent.submit(saveButton);
    // we should not be able to save at all when nothing has been entered
    expect(handleSave).not.toBeCalled();

    const nameTextBox = await screen.findByRole('textbox', {
      name: /name/i,
    });
    await userEvent.type(nameTextBox, 'any-name');
    expect(nameTextBox).toHaveValue('any-name');

    const numberTextBox = await screen.findByRole('spinbutton', {
      name: /Nummer/i,
    });
    // 1 has been already assigned
    await userEvent.type(numberTextBox, '1');

    // hence we should not be able to save
    fireEvent.submit(saveButton);
    expect(handleSave).not.toBeCalled();

    // add a 2 to the 1
    await userEvent.type(numberTextBox, '2');
    // and we should be able to save
    fireEvent.submit(saveButton);

    await waitFor(() =>
      expect(handleSave).toHaveBeenCalledWith({
        name: 'any-name',
        costCenterId: 12,
      }),
    );

    unmount();
  });
});
