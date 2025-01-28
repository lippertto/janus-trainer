import { useSuspenseQuery } from '@tanstack/react-query';
import { API_COST_CENTERS } from '@/lib/routes';
import { fetchListFromApi } from '@/lib/fetch';
import { DisciplineDto } from '@/lib/dto';

export function costCentersQuery(accessToken: string) {
  return useSuspenseQuery({
    queryKey: [API_COST_CENTERS],
    queryFn: () =>
      fetchListFromApi<DisciplineDto>(`${API_COST_CENTERS}`, accessToken),
    staleTime: 10 * 60 * 1000,
  });
}
