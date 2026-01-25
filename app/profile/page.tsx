'use client';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import React from 'react';
import {
  coursesForTrainerSuspenseQuery,
  userSuspenseQuery,
} from '@/lib/shared-queries';
import { EditIbanDialog } from '@/components/EditIbanDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UserDto } from '@/lib/dto';
import { patchInApi } from '@/lib/fetch';
import { API_USERS } from '@/lib/routes';
import { showError, showSuccess } from '@/lib/notifications';
import Profile from '@/app/profile/Profile';

function ProfilePageContents({ session }: { session: JanusSession }) {
  const queryClient = useQueryClient();
  const [showIbanDialog, setShowIbanDialog] = React.useState(false);
  const { data: user } = userSuspenseQuery(
    session.userId,
    session.accessToken,
    true,
    true,
    false,
  );

  const { data: courses } = coursesForTrainerSuspenseQuery(
    session.userId,
    session.accessToken,
  );

  const updateIbanMutation = useMutation({
    mutationFn: (iban: string) =>
      patchInApi<UserDto>(
        API_USERS,
        session.userId,
        { iban },
        session.accessToken,
      ),
    onSuccess: (_) => {
      showSuccess(`Iban aktualisiert`);
      queryClient.invalidateQueries({ queryKey: [API_USERS, session.userId] });
    },
    onError: (e) => {
      showError('Konnte IBAN nicht aktualisieren', e.message);
    },
  });

  return (
    <React.Fragment>
      <Profile
        user={user}
        courses={courses}
        handleEditIbanClick={() => setShowIbanDialog(true)}
        accessToken={session.accessToken}
      />
      <EditIbanDialog
        open={showIbanDialog}
        handleClose={() => {
          setShowIbanDialog(false);
        }}
        handleConfirm={updateIbanMutation.mutate}
        initialValue={user.iban}
      />
    </React.Fragment>
  );
}

export default function ProfilePage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }
  if (!session) {
    return <LoadingSpinner />;
  }

  return <ProfilePageContents session={session} />;
}
