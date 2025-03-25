import { useSuspenseQuery } from '@tanstack/react-query';
import { API_COST_CENTERS } from '@/lib/routes';
import { fetchListFromApi } from '@/lib/fetch';
import { CostCenterDto } from '@/lib/dto';

export function costCenterQuery(accessToken: string) {
  return useSuspenseQuery({
    queryKey: [API_COST_CENTERS],
    queryFn: () =>
      fetchListFromApi<CostCenterDto>(`${API_COST_CENTERS}`, accessToken),
    staleTime: 10 * 60 * 1000,
  });
}
