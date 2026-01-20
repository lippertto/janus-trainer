/**
 * @vitest-environment jsdom
 */
import 'cross-fetch/polyfill';
import React, { Suspense } from 'react';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { TrainerStatistics } from '@/app/TrainerStatistics';
import { ConfigurationValueListResponse, TrainerReportDto } from '@/lib/dto';

import { describe, expect, test, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('TrainerStatistics', () => {
  afterEach(() => {
    cleanup();
  });

  const mockConfiguration: ConfigurationValueListResponse = {
    value: [
      { key: 'max-compensation-cents-per-year', value: '300000' },
      { key: 'max-trainings-per-course', value: '44' },
    ],
  };

  const createWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    return ({ children }: { children: React.ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  };

  test('calculates total compensation correctly for single course', async () => {
    const mockReport: TrainerReportDto = {
      trainerName: 'Test Trainer',
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      courses: [
        {
          courseId: 1,
          courseName: 'Test Course',
          trainings: [
            { date: '2026-01-15', compensationCents: 5000 },
            { date: '2026-01-22', compensationCents: 5000 },
            { date: '2026-01-29', compensationCents: 5000 },
          ],
        },
      ],
    };

    const { container } = render(
      <Suspense fallback={<div>Loading...</div>}>
        <TrainerStatistics
          trainerReportQueryFn={async () => mockReport}
          configurationQueryFn={async () => mockConfiguration}
          userId="test-user-id"
          year={2026}
        />
      </Suspense>,
      { wrapper: createWrapper() },
    );

    // Total should be 150.00 EUR (15000 cents) / 3000.00 EUR (300000 cents)
    await waitFor(() => {
      expect(container).toHaveTextContent(
        'Gesamtvergütung: 150,00 € / 3.000,00 €',
      );
    });
    expect(screen.getByText('Test Course')).toBeInTheDocument();
    expect(screen.getByText('3 / 44 Einheiten')).toBeInTheDocument();
  });

  test('calculates total compensation correctly for multiple courses', async () => {
    const mockReport: TrainerReportDto = {
      trainerName: 'Test Trainer',
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      courses: [
        {
          courseId: 1,
          courseName: 'Course A',
          trainings: [
            { date: '2026-01-15', compensationCents: 10000 },
            { date: '2026-01-22', compensationCents: 10000 },
          ],
        },
        {
          courseId: 2,
          courseName: 'Course B',
          trainings: [
            { date: '2026-02-10', compensationCents: 7500 },
            { date: '2026-02-17', compensationCents: 7500 },
            { date: '2026-02-24', compensationCents: 7500 },
          ],
        },
      ],
    };

    const { container } = render(
      <Suspense fallback={<div>Loading...</div>}>
        <TrainerStatistics
          trainerReportQueryFn={async () => mockReport}
          configurationQueryFn={async () => mockConfiguration}
          userId="test-user-id"
          year={2026}
        />
      </Suspense>,
      { wrapper: createWrapper() },
    );

    // Total should be 425.00 EUR (42500 cents: 20000 + 22500) / 3000.00 EUR (300000 cents)
    await waitFor(() => {
      expect(container).toHaveTextContent(
        'Gesamtvergütung: 425,00 € / 3.000,00 €',
      );
    });
    expect(screen.getByText('Course A')).toBeInTheDocument();
    expect(screen.getByText('2 / 44 Einheiten')).toBeInTheDocument();
    expect(screen.getByText('Course B')).toBeInTheDocument();
    expect(screen.getByText('3 / 44 Einheiten')).toBeInTheDocument();
  });

  test('handles zero compensation correctly', async () => {
    const mockReport: TrainerReportDto = {
      trainerName: 'Test Trainer',
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      courses: [],
    };

    const { container } = render(
      <Suspense fallback={<div>Loading...</div>}>
        <TrainerStatistics
          trainerReportQueryFn={async () => mockReport}
          configurationQueryFn={async () => mockConfiguration}
          userId="test-user-id"
          year={2026}
        />
      </Suspense>,
      { wrapper: createWrapper() },
    );

    // Total should be 0.00 EUR / 3000.00 EUR (300000 cents)
    await waitFor(() => {
      expect(container).toHaveTextContent(
        'Gesamtvergütung: 0,00 € / 3.000,00 €',
      );
    });
    // Should not show course list when no courses
    expect(screen.queryByText('Pro Kurs')).not.toBeInTheDocument();
  });

  test('displays current year in title', async () => {
    const currentYear = new Date().getFullYear();
    const mockReport: TrainerReportDto = {
      trainerName: 'Test Trainer',
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      courses: [],
    };

    const { container } = render(
      <Suspense fallback={<div>Loading...</div>}>
        <TrainerStatistics
          trainerReportQueryFn={async () => mockReport}
          configurationQueryFn={async () => mockConfiguration}
          userId="test-user-id"
          year={2026}
        />
      </Suspense>,
      { wrapper: createWrapper() },
    );

    await waitFor(() => {
      expect(container).toHaveTextContent(`Statistiken ${currentYear}`);
    });
  });

  test('deduplicates trainings when multiple trainers work on the same day', async () => {
    // Scenario: Two trainers (A and B) both worked on the same course on the same dates
    // The trainer report for Trainer A includes their trainings, but some dates overlap
    // with when Trainer B also worked (co-teaching scenario)
    const mockReport: TrainerReportDto = {
      trainerName: 'Trainer A',
      periodStart: '2026-01-01',
      periodEnd: '2026-12-31',
      courses: [
        {
          courseId: 1,
          courseName: 'Co-taught Course',
          trainings: [
            // Same date appears multiple times (e.g., if this trainer and another trainer both taught)
            { date: '2026-01-15', compensationCents: 5000 },
            { date: '2026-01-15', compensationCents: 5000 }, // Duplicate date - same lesson, different trainer
            { date: '2026-01-22', compensationCents: 5000 },
            { date: '2026-01-29', compensationCents: 5000 },
            { date: '2026-01-29', compensationCents: 5000 }, // Duplicate date - same lesson, different trainer
          ],
        },
      ],
    };

    const { container } = render(
      <Suspense fallback={<div>Loading...</div>}>
        <TrainerStatistics
          trainerReportQueryFn={async () => mockReport}
          configurationQueryFn={async () => mockConfiguration}
          userId="test-user-id"
          year={2026}
        />
      </Suspense>,
      { wrapper: createWrapper() },
    );

    // Total compensation should count all entries: 5 * 5000 = 25000 cents = 250.00 EUR
    await waitFor(() => {
      expect(container).toHaveTextContent(
        'Gesamtvergütung: 250,00 € / 3.000,00 €',
      );
    });

    // Training count should only show 3 unique dates (2026-01-15, 2026-01-22, 2026-01-29)
    // not 5 trainings
    expect(screen.getByText('Co-taught Course')).toBeInTheDocument();
    expect(screen.getByText('3 / 44 Einheiten')).toBeInTheDocument();
  });
});
