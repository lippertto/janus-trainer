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
import Profile from '@/app/profile/Profile';
import { useUpdateIban } from '@/app/profile/useUpdateIban';

function ProfilePageContents({ session }: { session: JanusSession }) {
  const [showIbanDialog, setShowIbanDialog] = React.useState(false);
  const { data: user } = userSuspenseQuery(
    session.userId,
    session.accessToken,
    true,
    false,
  );

  const { data: courses } = coursesForTrainerSuspenseQuery(
    session.userId,
    session.accessToken,
  );

  const updateIbanMutation = useUpdateIban(session.userId, session.accessToken);

  return (
    <React.Fragment>
      <Profile
        user={user}
        groups={session.groups}
        courses={courses}
        handleEditIbanClick={() => setShowIbanDialog(true)}
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
