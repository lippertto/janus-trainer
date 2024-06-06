import { useQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_COMPENSATION_VALUES } from '@/lib/routes';
import { CompensationValueDto } from '@/lib/dto';

export function compensationValuesQuery(accessToken: string | null) {
  return useQuery({
    queryKey: ['compensationValues'],
    queryFn: () => fetchListFromApi<CompensationValueDto>(
      API_COMPENSATION_VALUES,
      accessToken!),
    throwOnError: true,
    enabled: Boolean(accessToken),
    staleTime: 10 * 60 * 1000,
  });
}