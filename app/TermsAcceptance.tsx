'use client';

import { JanusSession } from '@/lib/auth';

import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  termsOfServiceSuspenseQuery,
  userSuspenseQuery,
} from '@/lib/shared-queries';
import { API_USERS } from '@/lib/routes';
import { showError } from '@/lib/notifications';
import { useSession } from 'next-auth/react';
import { TosDialog } from '@/components/TosDialog';

function TermsAcceptanceContents(props: { session: JanusSession }) {
  const { session } = { ...props };
  const queryClient = useQueryClient();

  const { data: tosData } = termsOfServiceSuspenseQuery();
  const termsVersion = tosData.match(/Version\s*:\s*(.*)/im)![1];

  const { data: user } = userSuspenseQuery(session.userId, session.accessToken);

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_USERS}/${session.userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ termsAcceptedVersion: termsVersion }),
      });
      if (!response.ok) {
        throw new Error();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_USERS, session.userId] });
    },
    onError: () => {
      showError(
        'Konnte Nutzungsbedingungen nicht bestätigen. Bitte erneut versuchen',
      );
    },
  });

  if (user.termsAcceptedVersion === termsVersion) {
    return <></>;
  }

  return (
    <TosDialog
      tosData={tosData}
      handleAccept={acceptTermsMutation.mutate}
      open={true}
      needsToAccept={true}
    />
  );
}

export default function TermsAcceptance(): React.ReactNode {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (!session) {
    return <></>;
  }

  return <TermsAcceptanceContents session={session} />;
}
