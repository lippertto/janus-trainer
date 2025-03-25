import { useSuspenseQuery } from '@tanstack/react-query';
import { API_COST_CENTERS } from '@/lib/routes';
import { fetchListFromApi } from '@/lib/fetch';
import { CostCenterDto } from '@/lib/dto';
import { compareNamed } from '@/lib/sort-and-filter';

export function costCentersQuery(accessToken: string) {
  return useSuspenseQuery({
    queryKey: [API_COST_CENTERS],
    queryFn: async () => {
      const costCenters = await fetchListFromApi<CostCenterDto>(
        `${API_COST_CENTERS}?includeDeleted=true`,
        accessToken,
      );
      return costCenters.toSorted(compareNamed);
    },
    staleTime: 10 * 60 * 1000,
  });
}
