/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';

import { TrainingDto } from '@/lib/dto';
import { fireEvent, render, screen } from '@testing-library/react';
import { TrainingList } from './TrainingList';
import React from 'react';
import { DayOfWeek, TrainingStatus } from '@prisma/client';


test('Shows edit icon for new trainings', async () => {
  const edit = jest.fn();

  const trainings = [{
    id: 1, course: { name: 'any-name', weekdays: [DayOfWeek.SATURDAY] }, status: TrainingStatus.NEW,
  } as any as TrainingDto];

  render(<TrainingList
    trainings={trainings}
    holidays={[]}
    handleEdit={edit}
  />);

  const editButton = await screen.findByRole('button', { name: /Bearbeiten/i });
  fireEvent.click(editButton);

  expect(edit).toHaveBeenCalled();
});

test('Shows no edit icon for other trainings', async () => {
    const edit = jest.fn();

    const trainings = [{
      id: 1, course: { name: 'any-name', weekdays: [DayOfWeek.SATURDAY] }, status: TrainingStatus.APPROVED,
    } as any as TrainingDto];

    render(<TrainingList
      trainings={trainings}
      holidays={[]}
      handleEdit={edit}
    />);

    const editButton = screen.queryByRole('button', { name: /Bearbeiten/i });
    expect(editButton).toBeNull();
  },
);