/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import CompensationBox from '@/app/compensate/CompensationBox';
import { CompensationDto } from '@/lib/dto';
import '@testing-library/jest-dom/vitest';
import * as notifications from '@/lib/notifications';

vi.mock('@/lib/notifications', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

const createMockCompensation = (
  userId: string,
  userName: string,
  courseName: string,
  totalCents: number,
): CompensationDto => ({
  user: {
    id: userId,
    name: userName,
    email: `${userId}@example.com`,
    iban: 'DE89370400440532013000',
  },
  courseName,
  costCenterId: 'CC1',
  totalCompensationCents: totalCents,
  totalTrainings: 1,
  correspondingIds: [1],
  periodStart: '2026-01-01',
  periodEnd: '2026-01-31',
  iban: 'DE89370400440532013000',
});

describe('CompensationBox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('calls onGenerateSepa when all compensations are valid', () => {
    const validCompensations = [
      createMockCompensation('user1', 'Max Mustermann', 'Course A', 10000),
      createMockCompensation('user2', 'Jane Doe', 'Course B', 5000),
    ];

    const mockOnMarkAsCompensated = vi.fn();
    const mockOnGenerateSepa = vi.fn();

    const { unmount } = render(
      <CompensationBox
        compensations={validCompensations}
        selectedPaymentId={-1}
        trainer={null}
        onMarkAsCompensated={mockOnMarkAsCompensated}
        onGenerateSepa={mockOnGenerateSepa}
      />,
    );

    const sepaButton = screen.getByRole('button', {
      name: /SEPA XML generieren/i,
    });
    fireEvent.click(sepaButton);

    expect(notifications.showError).not.toHaveBeenCalled();
    expect(mockOnGenerateSepa).toHaveBeenCalledWith(validCompensations);

    unmount();
  });

  test('shows error and does not call onGenerateSepa when compensation has zero euros', () => {
    const compensationsWithZero = [
      createMockCompensation('user1', 'Max Mustermann', 'Course A', 10000),
      createMockCompensation('user2', 'Jane Doe', 'Course B', 0),
    ];

    const mockOnMarkAsCompensated = vi.fn();
    const mockOnGenerateSepa = vi.fn();

    const { unmount } = render(
      <CompensationBox
        compensations={compensationsWithZero}
        selectedPaymentId={-1}
        trainer={null}
        onMarkAsCompensated={mockOnMarkAsCompensated}
        onGenerateSepa={mockOnGenerateSepa}
      />,
    );

    const sepaButton = screen.getByRole('button', {
      name: /SEPA XML generieren/i,
    });
    fireEvent.click(sepaButton);

    expect(notifications.showError).toHaveBeenCalledWith(
      'Ungültige Beträge (negativ oder 0,00 €): Jane Doe / Course B (0.00 €)',
    );
    expect(mockOnGenerateSepa).not.toHaveBeenCalled();

    unmount();
  });

  test('shows error when compensation has negative euros', () => {
    const compensationsWithNegative = [
      createMockCompensation('user1', 'Max Mustermann', 'Course A', 10000),
      createMockCompensation('user2', 'Jane Doe', 'Course B', -500),
    ];

    const mockOnMarkAsCompensated = vi.fn();
    const mockOnGenerateSepa = vi.fn();

    const { unmount } = render(
      <CompensationBox
        compensations={compensationsWithNegative}
        selectedPaymentId={-1}
        trainer={null}
        onMarkAsCompensated={mockOnMarkAsCompensated}
        onGenerateSepa={mockOnGenerateSepa}
      />,
    );

    const sepaButton = screen.getByRole('button', {
      name: /SEPA XML generieren/i,
    });
    fireEvent.click(sepaButton);

    expect(notifications.showError).toHaveBeenCalledWith(
      'Ungültige Beträge (negativ oder 0,00 €): Jane Doe / Course B (-5.00 €)',
    );
    expect(mockOnGenerateSepa).not.toHaveBeenCalled();

    unmount();
  });

  test('shows error with multiple invalid compensations', () => {
    const compensationsWithMultipleInvalid = [
      createMockCompensation('user1', 'Max Mustermann', 'Course A', 10000),
      createMockCompensation('user2', 'Jane Doe', 'Course B', 0),
      createMockCompensation('user3', 'John Smith', 'Course C', -1000),
    ];

    const mockOnMarkAsCompensated = vi.fn();
    const mockOnGenerateSepa = vi.fn();

    const { unmount } = render(
      <CompensationBox
        compensations={compensationsWithMultipleInvalid}
        selectedPaymentId={-1}
        trainer={null}
        onMarkAsCompensated={mockOnMarkAsCompensated}
        onGenerateSepa={mockOnGenerateSepa}
      />,
    );

    const sepaButton = screen.getByRole('button', {
      name: /SEPA XML generieren/i,
    });
    fireEvent.click(sepaButton);

    expect(notifications.showError).toHaveBeenCalledWith(
      'Ungültige Beträge (negativ oder 0,00 €): Jane Doe / Course B (0.00 €), John Smith / Course C (-10.00 €)',
    );
    expect(mockOnGenerateSepa).not.toHaveBeenCalled();

    unmount();
  });

  test('calls onMarkAsCompensated with training IDs', async () => {
    const validCompensations = [
      createMockCompensation('user1', 'Max Mustermann', 'Course A', 10000),
      createMockCompensation('user2', 'Jane Doe', 'Course B', 5000),
    ];

    const mockOnMarkAsCompensated = vi.fn().mockResolvedValue(undefined);
    const { unmount } = render(
      <CompensationBox
        compensations={validCompensations}
        selectedPaymentId={-1}
        trainer={null}
        onMarkAsCompensated={mockOnMarkAsCompensated}
        onGenerateSepa={vi.fn()}
      />,
    );

    const markButton = screen.getByRole('button', {
      name: /Alle als überwiesen markieren/i,
    });
    fireEvent.click(markButton);

    expect(mockOnMarkAsCompensated).toHaveBeenCalledWith([1, 1]);

    unmount();
  });

  test('shows error when marking as compensated with zero euros', () => {
    const compensationsWithZero = [
      createMockCompensation('user1', 'Max Mustermann', 'Course A', 0),
    ];

    const { unmount } = render(
      <CompensationBox
        compensations={compensationsWithZero}
        selectedPaymentId={-1}
        trainer={null}
        onMarkAsCompensated={vi.fn()}
        onGenerateSepa={vi.fn()}
      />,
    );

    const markButton = screen.getByRole('button', {
      name: /Alle als überwiesen markieren/i,
    });
    fireEvent.click(markButton);

    expect(notifications.showError).toHaveBeenCalledWith(
      'Ungültige Beträge (negativ oder 0,00 €): Max Mustermann / Course A (0.00 €)',
    );
    expect(vi.fn()).not.toHaveBeenCalled();

    unmount();
  });

  test('shows error when onMarkAsCompensated fails', async () => {
    const validCompensations = [
      createMockCompensation('user1', 'Max Mustermann', 'Course A', 10000),
    ];

    const mockOnMarkAsCompensated = vi
      .fn()
      .mockRejectedValue(new Error('Network error'));

    const { unmount } = render(
      <CompensationBox
        compensations={validCompensations}
        selectedPaymentId={-1}
        trainer={null}
        onMarkAsCompensated={mockOnMarkAsCompensated}
        onGenerateSepa={vi.fn()}
      />,
    );

    const markButton = screen.getByRole('button', {
      name: /Alle als überwiesen markieren/i,
    });
    fireEvent.click(markButton);

    // Wait for async handler to complete
    await vi.waitFor(() => {
      expect(notifications.showError).toHaveBeenCalledWith(
        'Konnte Zahlungen nicht als überwiesen markieren',
        'Network error',
      );
    });

    unmount();
  });

  test('SEPA XML button is disabled when trainer filter is active', () => {
    const validCompensations = [
      createMockCompensation('user1', 'Max Mustermann', 'Course A', 10000),
    ];

    const mockTrainer = {
      id: 'user1',
      name: 'Max Mustermann',
      email: 'max@example.com',
    };

    const mockOnMarkAsCompensated = vi.fn();
    const mockOnGenerateSepa = vi.fn();

    const { unmount } = render(
      <CompensationBox
        compensations={validCompensations}
        selectedPaymentId={-1}
        trainer={mockTrainer}
        onMarkAsCompensated={mockOnMarkAsCompensated}
        onGenerateSepa={mockOnGenerateSepa}
      />,
    );

    const sepaButton = screen.getByRole('button', {
      name: /SEPA XML generieren/i,
    });
    expect(sepaButton).toBeDisabled();

    unmount();
  });

  test('Mark as compensated button is disabled when payment is not current', () => {
    const validCompensations = [
      createMockCompensation('user1', 'Max Mustermann', 'Course A', 10000),
    ];

    const { unmount } = render(
      <CompensationBox
        compensations={validCompensations}
        selectedPaymentId={123}
        trainer={null}
        onMarkAsCompensated={vi.fn()}
        onGenerateSepa={vi.fn()}
      />,
    );

    const markButton = screen.getByRole('button', {
      name: /Alle als überwiesen markieren/i,
    });
    expect(markButton).toBeDisabled();

    unmount();
  });
});
