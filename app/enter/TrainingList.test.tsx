/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';

import { TrainingDto } from '@/lib/dto';
import { fireEvent, render, screen } from '@testing-library/react';
import { TrainingList } from './TrainingList';
import React from 'react';
import { DayOfWeek, TrainingStatus } from '@prisma/client';

test('new trainings can be clicked', async () => {
  const edit = jest.fn();

  const trainings = [
    {
      id: 1,
      course: { name: 'any-name', weekdays: [DayOfWeek.SATURDAY] },
      status: TrainingStatus.NEW,
      comment: 'any-comment',
    } as any as TrainingDto,
  ];

  render(
    <TrainingList trainings={trainings} holidays={[]} handleEdit={edit} />,
  );

  const editButton = await screen.findByRole('button', {
    name: /any-comment/i,
  });
  fireEvent.click(editButton);

  expect(edit).toHaveBeenCalled();
});

test('non-new trainings cannot be clicked', async () => {
  const edit = jest.fn();

  const trainings = [
    {
      id: 1,
      course: { name: 'any-name', weekdays: [DayOfWeek.SATURDAY] },
      status: TrainingStatus.APPROVED,
    } as any as TrainingDto,
  ];

  render(
    <TrainingList trainings={trainings} holidays={[]} handleEdit={edit} />,
  );

  const editButton = screen.queryByRole('button');
  expect(editButton).toBeNull();
});
