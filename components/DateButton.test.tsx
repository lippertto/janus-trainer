/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import DateButton from '@/components/DateButton';
import dayjs from 'dayjs';
import { describe, expect, test, vi } from 'vitest';

describe('Date Button', () => {
  test('shows actual dates for other dates', async () => {
    const firstDayOfQuarter = dayjs('2023-04-05');
    const lastDayOfQuarter = dayjs('2023-05-06');

    render(
      <DateButton
        startDate={firstDayOfQuarter}
        setStartDate={vi.fn()}
        endDate={lastDayOfQuarter}
        setEndDate={vi.fn()}
        options={[]}
      />,
    );

    await screen.findByRole('button', { name: /05.04.2023 - 06.05.2023/i });
  });
});
