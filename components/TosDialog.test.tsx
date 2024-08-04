/**
 * @jest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { TosDialog } from '@/components/TosDialog';
import '@testing-library/jest-dom';

// https://github.com/remarkjs/react-markdown/issues/635#issuecomment-991137447
jest.mock("react-markdown", () => (props: {children: React.ReactNode}) => {
  return <>{props.children}</>
})

describe('Terms of Service Dialog', () => {
  test('terms need to be accepted (if required)', async () => {
    render(<TosDialog handleAccept={() => {
    }} needsToAccept={true} open={true} tosData={''} />);

    const acceptCheckbox = screen.getByRole('checkbox');
    expect(acceptCheckbox).not.toBeChecked()

    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.textContent).toBe("Erst akzeptieren")

    fireEvent.click(acceptCheckbox);
    expect(button).not.toBeDisabled();
    expect(button.textContent).toBe("Schließen")
  });

  test('terms do not need to be accepted if not required', async () => {
    render(<TosDialog handleAccept={() => {
    }} needsToAccept={false} open={true} tosData={''} />);

    const button = screen.getByRole('button');
    expect(button).not.toBeDisabled();
  })
});