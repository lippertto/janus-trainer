import { patchInApi } from '@/lib/fetch';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserDto } from '@/lib/dto';
import { API_USERS } from '@/lib/routes';
import { showError, showSuccess } from '@/lib/notifications';

export function useUpdateIban(userId: string, accessToken: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (iban: string) =>
      patchInApi<UserDto>(API_USERS, userId, { iban }, accessToken),
    onSuccess: () => {
      showSuccess('IBAN aktualisiert');
      queryClient.invalidateQueries({ queryKey: [API_USERS, userId] });
    },
    onError: (error: Error) => {
      showError('Konnte IBAN nicht aktualisieren', error.message);
    },
  });
}
