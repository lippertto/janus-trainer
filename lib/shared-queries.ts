import {
  useQuery,
  UseQueryResult,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { fetchListFromApi, fetchSingleEntity } from '@/lib/fetch';
import {
  API_COMPENSATION_CLASSES,
  API_COMPENSATION_VALUES,
  API_COMPENSATIONS,
  API_COURSES,
  API_DISCIPLINES,
  API_HOLIDAYS,
  API_PAYMENTS,
  API_TRAINING_STATISTICS,
  API_USERS,
} from '@/lib/routes';
import {
  CompensationClassDto,
  CompensationDto,
  CompensationValueDto,
  CourseDto,
  DisciplineDto,
  LoginInfo,
  PaymentDto,
  TrainingStatisticDto,
  UserDto,
} from '@/lib/dto';
import { Holiday } from '@prisma/client';
import { CURRENT_PAYMENT_ID } from '@/app/compensate/PaymentSelection';

const ONE_MINUTE = 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;

function holidaysQueryFunction(accessToken: string, years: number[]) {
  return fetchListFromApi<Holiday>(
    `${API_HOLIDAYS}?year=${years.map((y) => y.toString()).join(',')}`,
    accessToken,
  );
}

/**
 * Query for the holidays.
 *
 * @param accessToken
 * @param years Which years to include. Must not be empty
 */
export function holidaysSuspenseQuery(accessToken: string, years: number[]) {
  if (years.length === 0) throw new Error('years must not be empty');

  const key = [API_HOLIDAYS, ...years];
  return useSuspenseQuery({
    queryKey: key,
    queryFn: () => holidaysQueryFunction(accessToken, years),
  });
}

export function trainersSuspenseQuery(accessToken: string | null) {
  return useSuspenseQuery({
    queryKey: [API_USERS, 'group=trainers'],
    queryFn: () =>
      fetchListFromApi<UserDto>(`${API_USERS}?group=trainers`, accessToken!),
    staleTime: TEN_MINUTES,
  });
}

export function resultHasData(result: UseQueryResult) {
  if (result.isError || result.isLoading || result.isRefetching) {
    return false;
  }
  if (result.status === 'pending') {
    return false;
  }
  return true;
}

export function coursesForTrainerSuspenseQuery(
  userId: string,
  accessToken: string,
) {
  return useSuspenseQuery({
    queryKey: ['courses', userId],
    queryFn: () =>
      fetchListFromApi<CourseDto>(
        `${API_COURSES}?trainerId=${userId}`,
        accessToken,
      ),
    staleTime: TEN_MINUTES,
  });
}

export function compensationValuesSuspenseQuery(accessToken: string) {
  return useSuspenseQuery({
    queryKey: [API_COMPENSATION_VALUES],
    queryFn: () =>
      fetchListFromApi<CompensationValueDto>(
        `${API_COMPENSATION_VALUES}`,
        accessToken,
      ),
    staleTime: 60 * 1000,
  });
}

export function userSuspenseQuery(
  userId: string,
  accessToken: string,
  includeCognitoProperties: boolean = false,
  expandCompensationClasses: boolean = false,
  expandCompensationValues: boolean = false,
) {
  let expand = [];
  if (includeCognitoProperties) {
    expand.push('cognito');
  }
  if (expandCompensationClasses) {
    expand.push('compensationClasses');
  }
  if (expandCompensationValues) {
    expand.push('compensationValues');
  }
  return useSuspenseQuery({
    queryKey: [
      API_USERS,
      userId,
      includeCognitoProperties,
      expandCompensationClasses,
      expandCompensationValues,
    ],
    queryFn: () =>
      fetchSingleEntity<UserDto>(API_USERS, userId, accessToken, [
        `expand=${expand.join(',')}`,
      ]),
  });
}

export function disciplinesSuspenseQuery(accessToken: string) {
  return useSuspenseQuery({
    queryKey: [API_DISCIPLINES],
    queryFn: () =>
      fetchListFromApi<DisciplineDto>(`${API_DISCIPLINES}`, accessToken),
    staleTime: TEN_MINUTES,
  });
}

export function trainingStatisticsSuspenseQuery(
  accessToken: string,
  year: number,
  trainerId: string | null,
  groupBy: 'trainer' | 'cost-center',
) {
  const params = new URLSearchParams();
  params.append('year', year.toString());
  params.append('groupBy', groupBy);
  if (trainerId) {
    params.append('trainerId', trainerId);
  }

  return useSuspenseQuery({
    queryKey: [API_TRAINING_STATISTICS, year, trainerId],
    queryFn: () =>
      fetchListFromApi<TrainingStatisticDto>(
        `${API_TRAINING_STATISTICS}?${params.toString()}`,
        accessToken,
        'POST',
      ),
    staleTime: TEN_MINUTES,
  });
}

export function termsOfServiceSuspenseQuery() {
  return useSuspenseQuery({
    queryKey: ['terms-and-conditions'],
    queryFn: async () => {
      const response = await fetch('/terms-and-conditions.md');
      return await response.text();
    },
    staleTime: TEN_MINUTES,
  });
}

export function compensationClassesSuspenseQuery(
  accessToken: string,
  expandCompensationValues: boolean = false,
) {
  let query = '';
  if (expandCompensationValues) {
    query = '?expand=compensationValues';
  }
  return useSuspenseQuery({
    queryKey: [API_COMPENSATION_CLASSES, expandCompensationValues],
    queryFn: () =>
      fetchListFromApi<CompensationClassDto>(
        `${API_COMPENSATION_CLASSES}${query}`,
        accessToken,
      ),
    staleTime: TEN_MINUTES,
  });
}

export function compensationClassesQuery(accessToken: string) {
  const key = [API_COMPENSATION_CLASSES, true];
  return useQuery({
    queryKey: key,
    queryFn: () =>
      fetchListFromApi<CompensationClassDto>(
        `${API_COMPENSATION_CLASSES}?expand=compensationValues`,
        accessToken,
      ),
    throwOnError: true,
    enabled: Boolean(accessToken),
    staleTime: TEN_MINUTES,
  });
}

export function paymentsSuspenseQuery(accessToken: string, trainerId?: string) {
  const params = new URLSearchParams();
  if (trainerId) {
    params.append('trainerId', trainerId);
  }
  return useSuspenseQuery({
    queryKey: [API_PAYMENTS, trainerId],
    queryFn: () =>
      fetchListFromApi<PaymentDto>(`${API_PAYMENTS}?${params}`, accessToken),
    staleTime: TEN_MINUTES,
  });
}

export function queryCompensations(accessToken: string, paymentId: number) {
  const params = new URLSearchParams();

  if (paymentId !== CURRENT_PAYMENT_ID) {
    params.set('paymentId', paymentId.toString());
  }

  return useSuspenseQuery({
    queryKey: [API_COMPENSATIONS, paymentId],
    queryFn: () =>
      fetchListFromApi<CompensationDto>(
        `${API_COMPENSATIONS}?${params.toString()}`,
        accessToken,
      ),
    staleTime: 10 * 60 * 1000,
  }).data;
}

export async function resendInvitation(accessToken: string, userId: string) {
  await fetch(`${API_USERS}/${userId}/login-info:resend-invitation`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function loginInfoSuspenseQuery(accessToken: string, userId: string) {
  return useSuspenseQuery({
    queryKey: [API_USERS, userId, 'login-info'],
    queryFn: async () => {
      const response = await fetch(`${API_USERS}/${userId}/login-info`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.status !== 200) {
        return Promise.reject(
          new Error(
            `Failed to get login-info. Error is: ${await response.text()}`,
          ),
        );
      }
      return (await response.json()) as LoginInfo;
    },
    staleTime: TEN_MINUTES,
  });
}
