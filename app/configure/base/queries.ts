import {
  QueryClient,
  useMutation,
  useSuspenseQuery,
} from '@tanstack/react-query';
import { fetchListFromApi, patchInApi, updateInApi } from '@/lib/fetch';
import { ConfigurationValueDto, UserDto } from '@/lib/dto';
import { API_USERS } from '@/lib/routes';
import { showError, showSuccess } from '@/lib/notifications';

const ALL_VALUES_QUERY_KEY = '/configuration';
const API_CONFIGURATION = '/api/configuration';

export function getAllConfigurationValues(accessToken: string) {
  return useSuspenseQuery({
    queryKey: [ALL_VALUES_QUERY_KEY],
    queryFn: () =>
      fetchListFromApi<ConfigurationValueDto>(API_CONFIGURATION, accessToken),
    staleTime: 10 * 60 * 1000,
  });
}

export function updateConfigurationValueMutation(
  queryClient: QueryClient,
  accessToken: string,
) {
  return useMutation({
    mutationFn: (v: ConfigurationValueDto) =>
      updateInApi<UserDto>(
        API_CONFIGURATION,
        v.key,
        { value: v.value },
        accessToken,
      ),
    onSuccess: (_) => {
      showSuccess(`Konfigurationswert aktualisiert`);
      queryClient
        .invalidateQueries({ queryKey: [ALL_VALUES_QUERY_KEY] })
        .then(() => {});
    },
    onError: (e) => {
      showError('Konnte Konfigurationswert nicht aktualisieren', e.message);
    },
  });
}
