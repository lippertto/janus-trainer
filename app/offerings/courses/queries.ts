import { useSuspenseQuery } from '@tanstack/react-query';
import { API_DISCIPLINES } from '@/lib/routes';
import { fetchListFromApi } from '@/lib/fetch';
import { DisciplineDto } from '@/lib/dto';

export function costCenterQuery(accessToken: string) {
  return useSuspenseQuery({
    queryKey: [API_DISCIPLINES],
    queryFn: () =>
      fetchListFromApi<DisciplineDto>(`${API_DISCIPLINES}`, accessToken),
    staleTime: 10 * 60 * 1000,
  });
}
