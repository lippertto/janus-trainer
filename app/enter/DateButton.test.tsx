/**
 * @jest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import DateButton from '@/app/enter/DateButton';
import dayjs from 'dayjs';

describe('Date Button', () => {
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
