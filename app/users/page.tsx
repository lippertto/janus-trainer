'use client';

import React from 'react';

import { useSession } from 'next-auth/react';

import UserTable from './UserTable';

import LoginRequired from '../../components/LoginRequired';
import type { JanusSession } from '@/lib/auth';

function UserManagementContents(props: {session: JanusSession}) {
  return <React.Fragment>
    <UserTable
      session={props.session}
    />
  </React.Fragment>
}

export default function UserManagementPage() {

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <UserManagementContents session={session}/>;
}
