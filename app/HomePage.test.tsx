/**
 * @vitest-environment jsdom
 */
// this polyfill helps with the following error-message:
// ReferenceError: Request is not defined
import 'cross-fetch/polyfill';
import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { HomePageContents } from '@/app/HomePage';

import { afterEach, describe, expect, test, vi } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { JanusSession } from '@/lib/auth';
import {
  CompensationClassDto,
  ConfigurationValueListResponse,
  Group,
  TrainerReportDto,
  UserDto,
} from '@/lib/dto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// https://github.com/remarkjs/react-markdown/issues/635#issuecomment-991137447
vi.mock('react-markdown', () => ({
  default: (props: { children: React.ReactNode }) => <>{props.children}</>,
}));

vi.mock('next-auth/jwt', () => () => {});

vi.mock('@/app/api/users/[userId]/select-one-user', () => ({
  __esModule: true,
  selectOneUser: vi.fn(),
}));

describe('HomePage', () => {
  afterEach(() => {
    cleanup();
  });

  const mockSession: JanusSession = {
    userId: 'any-user-id',
    accessToken: 'test-token',
  } as JanusSession;

  const mockTrainerReport: TrainerReportDto = {
    trainerName: 'Test Trainer',
    periodStart: '2026-01-01',
    periodEnd: '2026-12-31',
    courses: [],
  };

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

  test('shows warning if trainer and iban is not set', async () => {
    const mockUserInfo: UserDto = {
      groups: [Group.TRAINERS],
      iban: null,
      compensationClasses: [] as CompensationClassDto[],
    } as UserDto;

    render(
      <HomePageContents
        session={mockSession}
        userInfoQueryFn={async () => mockUserInfo}
        trainerReportQueryFn={async () => mockTrainerReport}
        configurationQueryFn={async () => mockConfiguration}
        fetchCoursesForTrainerQueryFn={async () => []}
      />,
      { wrapper: createWrapper() },
    );

    expect(
      await screen.findByText('Hier klicken um deine IBAN einzutragen.'),
    ).toBeVisible();
  });

  test('shows no warning if admin and iban is not set', async () => {
    const mockUserInfo: UserDto = {
      groups: [Group.ADMINS],
      iban: null,
    } as UserDto;

    render(
      <HomePageContents
        session={mockSession}
        userInfoQueryFn={async () => mockUserInfo}
        trainerReportQueryFn={async () => mockTrainerReport}
        configurationQueryFn={async () => mockConfiguration}
        fetchCoursesForTrainerQueryFn={async () => []}
      />,
      { wrapper: createWrapper() },
    );

    expect(
      screen.queryByText('Bitte die IBAN im Profil eintragen.'),
    ).not.toBeInTheDocument();
  });

  test('shows no warning if trainer and iban is set', async () => {
    const mockUserInfo: UserDto = {
      groups: [Group.TRAINERS],
      iban: 'DE89370400440532013000',
      compensationClasses: [] as CompensationClassDto[],
    } as UserDto;

    render(
      <HomePageContents
        session={mockSession}
        userInfoQueryFn={async () => mockUserInfo}
        trainerReportQueryFn={async () => mockTrainerReport}
        configurationQueryFn={async () => mockConfiguration}
        fetchCoursesForTrainerQueryFn={async () => []}
      />,
      { wrapper: createWrapper() },
    );

    expect(
      screen.queryByText('Bitte die IBAN im Profil eintragen.'),
    ).not.toBeInTheDocument();
  });
});
