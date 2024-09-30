import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { UserDto } from '@/lib/dto';
import { API_USERS } from '@/lib/routes';

export function queryUsers(accessToken: string) {
  return useSuspenseQuery({
    queryKey: ['users'],
    queryFn: () => fetchListFromApi<UserDto>(`${API_USERS}`, accessToken),
    staleTime: 10 * 60 * 1000,
  });
}
