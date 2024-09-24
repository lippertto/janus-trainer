/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import DateButton from '@/app/enter/DateButton';
import dayjs from 'dayjs';
import {
  FIRST_DAY_OF_PREVIOUS_QUARTER,
  FIRST_DAY_OF_THIS_QUARTER,
  LAST_DAY_OF_PREVIOUS_QUARTER,
  LAST_DAY_OF_THIS_QUARTER,
} from '@/lib/helpers-for-date';

describe('Date Button', () => {
  test("shows 'Aktuelles Quartal' for current quarter", async () => {
    render(
      <DateButton
        onClick={jest.fn()}
        startDate={FIRST_DAY_OF_THIS_QUARTER}
        endDate={LAST_DAY_OF_THIS_QUARTER}
      />,
    );

    await screen.findByRole('button', { name: /aktuelles Quartal/i });
  });

  test("shows 'Letztes Quartal' for previous quarter", async () => {
    render(
      <DateButton
        onClick={jest.fn()}
        startDate={FIRST_DAY_OF_PREVIOUS_QUARTER}
        endDate={LAST_DAY_OF_PREVIOUS_QUARTER}
      />,
    );

    await screen.findByRole('button', { name: /letztes Quartal/i });
  });

  test('shows actual dates for other dates', async () => {
    const firstDayOfQuarter = dayjs('2023-04-05');
    const lastDayOfQuarter = dayjs('2023-05-06');

    render(
      <DateButton
        onClick={jest.fn()}
        startDate={firstDayOfQuarter}
        endDate={lastDayOfQuarter}
      />,
    );

    await screen.findByRole('button', { name: /05.04.2023 - 06.05.2023/i });
  });
});
