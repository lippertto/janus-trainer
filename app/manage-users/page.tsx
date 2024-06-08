'use client';

import React from 'react';

import { useSession } from 'next-auth/react';

import UserTable from './UserTable';

import LoginRequired from '../../components/LoginRequired';
import type { JanusSession } from '@/lib/auth';
import { UserDto } from '@/lib/dto';

export default function UserManagementPage() {
  const [showCreate, setShowCreate] = React.useState<boolean>(false);
  const [showEdit, setShowEdit] = React.useState<boolean>(false);
  const [users, setUsers] = React.useState<UserDto[]>([]);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <>
      <UserTable
        session={session}
      />
    </>
  );
}
