import { useQuery, UseQueryResult, useSuspenseQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_COMPENSATION_VALUES, API_COURSES, API_HOLIDAYS, API_USERS } from '@/lib/routes';
import { CompensationValueDto, CourseDto, HolidayDto, UserDto } from '@/lib/dto';
import { Holiday } from '@prisma/client';

const TEN_MINUTES = 10 * 60 * 1000;

export function compensationValuesQuery(accessToken: string | null) {
  return useQuery({
    queryKey: ['compensationValues'],
    queryFn: () => fetchListFromApi<CompensationValueDto>(
      API_COMPENSATION_VALUES,
      accessToken!),
    throwOnError: true,
    enabled: Boolean(accessToken),
    staleTime: TEN_MINUTES,
  });
}

/**
 * Query for the holidays.
 *
 * @param accessToken
 * @param years Which years to include. Must not be empty
 */
export function holidaysQuery(
  accessToken: string | null,
  years: number[]) {

  if (years.length === 0) throw new Error('years must not be empty');

  const key = ['holidays', ...years];
  return useQuery({
    queryKey: key,
    queryFn: () => fetchListFromApi<Holiday>(
      `${API_HOLIDAYS}?year=${years.map((y) => (y.toString())).join(',')}`,
      accessToken!,
    ),
    throwOnError: true,
    enabled: Boolean(accessToken),
    staleTime: TEN_MINUTES,
  });
}

export function trainersQuery(accessToken: string | null) {
  return useQuery({
    queryKey: ['trainers'],
    queryFn: () => fetchListFromApi<UserDto>(
      `${API_USERS}?group=trainers`,
      accessToken!,
    ),
    throwOnError: true,
    enabled: Boolean(accessToken),
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

export function coursesForTrainerSuspenseQuery(userId: string, accessToken: string) {
  return useSuspenseQuery({
      queryKey: ['courses', userId],
      queryFn: () => fetchListFromApi<CourseDto>(
        `${API_COURSES}?trainerId=${userId}`,
        accessToken,
      ),
    staleTime: TEN_MINUTES
    },
  );
}
