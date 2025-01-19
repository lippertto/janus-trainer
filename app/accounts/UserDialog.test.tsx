/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { UserDialog } from '@/app/accounts/UserDialog';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';

async function fillTextBox(name: string, text: string) {
  const nameTextBox = await screen.findByRole('textbox', {
    name: new RegExp(name, 'i'),
  });
  await userEvent.type(nameTextBox, text);
}

describe('UserDialog', () => {
  test('renders without crashing', () => {
    const { unmount } = render(
      <UserDialog
        compensationClasses={[]}
        handleClose={vi.fn()}
        handleSave={vi.fn()}
        handleResendInvitation={vi.fn()}
        toEdit={null}
        open={true}
        queryLoginInfo={vi.fn()}
      />,
    );

    unmount();
  });

  test('shows error when zwsp is contained in name', async () => {
    const badName = 'Luca ​Leppert';

    const { unmount } = render(
      <UserDialog
        compensationClasses={[]}
        handleClose={vi.fn()}
        handleSave={vi.fn()}
        handleResendInvitation={vi.fn()}
        toEdit={null}
        open={true}
        queryLoginInfo={vi.fn()}
      />,
    );

    const nameBox = await screen.findByRole('textbox', {
      name: 'Name',
    });
    await userEvent.type(nameBox, badName);

    await fillTextBox('E-Mail', 'any-email@gmail.com');

    const saveButton = await screen.findByRole('button', { name: 'Speichern' });
    expect(saveButton).toBeEnabled();
    fireEvent.submit(saveButton);

    await waitFor(() =>
      expect(nameBox).toHaveAttribute('aria-invalid', 'true'),
    );
    expect(screen.getByText(/Sonderzeichen/i)).toBeInTheDocument();
    unmount();
  });
});
