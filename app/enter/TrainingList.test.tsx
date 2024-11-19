/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { TrainingDto } from '@/lib/dto';
import { fireEvent, render, screen } from '@testing-library/react';
import { TrainingList } from './TrainingList';
import { DayOfWeek, TrainingStatus } from '@prisma/client';
import { describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';

describe('TrainingList', () => {
  test('new trainings can be clicked', async () => {
    const edit = vi.fn();

    const trainings = [
      {
        id: 1,
        course: { name: 'any-name', weekdays: [DayOfWeek.SATURDAY] },
        status: TrainingStatus.NEW,
        comment: 'any-comment',
      } as any as TrainingDto,
    ];

    const { unmount } = render(
      <TrainingList
        trainings={trainings}
        holidays={[]}
        handleEdit={edit}
        duplicates={[]}
      />,
    );

    const editButton = await screen.findByRole('button', {
      name: /any-comment/i,
    });
    fireEvent.click(editButton);

    expect(edit).toHaveBeenCalled();

    unmount();
  });

  test('non-new trainings cannot be clicked', async () => {
    const edit = vi.fn();

    const trainings = [
      {
        id: 1,
        course: { name: 'any-name', weekdays: [DayOfWeek.SATURDAY] },
        status: TrainingStatus.APPROVED,
      } as any as TrainingDto,
    ];

    const { unmount } = render(
      <TrainingList
        trainings={trainings}
        holidays={[]}
        handleEdit={edit}
        duplicates={[]}
      />,
    );

    const editButton = screen.queryByRole('button');
    expect(editButton).toBeNull();

    unmount();
  });
});
