'use client';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '../../lib/auth';
import LoginRequired from '../../components/LoginRequired';
import UserTable from './UserTable';
import React from 'react';
import { Backend, type User } from '../../lib/backend';
import { GridRowId } from '@mui/x-data-grid';
import { EditUserDialog } from './EditUserDialog';

export default function UserManagementPage() {
  const backend = React.useRef<Backend>(new Backend());

  const [showEdit, setShowEdit] = React.useState<boolean>(false);
  const [showCreate, setShowCreate] = React.useState<boolean>(false);
  const [users, setUsers] = React.useState<User[]>([]);
  const [userToEdit, setUserToEdit] = React.useState<User | null>(null);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const refresh = React.useCallback(async () => {
    setUserToEdit(null);
    setUsers([]);
    if (session?.accessToken) {
      backend.current.getAllUsers().then((result) => {
        setUsers(result);
      });
    }
  }, [session?.accessToken]);

  function handleUserEditClick(id: GridRowId) {
    const user = users.find((t) => t.id === id);
    if (!user) {
      console.error(`Could not find user with id ${id}`);
    }
    setShowEdit(true);
    setUserToEdit(user ?? null);
  }

  React.useEffect(() => {
    backend.current.setAccessToken(session?.accessToken);
    refresh();
  }, [session?.accessToken, refresh]);

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <>
      <UserTable
        users={users}
        handleAddUser={() => setShowCreate(true)}
        handleRefresh={refresh}
        handleUserEditClick={handleUserEditClick}
      />

      <EditUserDialog
        open={showEdit}
        handleClose={() => setShowEdit(false)}
        handleSave={(_1, _2, _3, _4, _5, _6) =>
          backend.current
            .updateUser(_1!, _2, _3, _4, _5, _6)
            .then((updatedUser) => {
              setUserToEdit(null);
              setUsers(
                users.map((u) => (u.id === userToEdit?.id ? updatedUser : u)),
              );
            })
        }
        user={userToEdit}
      />
      <EditUserDialog
        open={showCreate}
        handleClose={() => setShowCreate(false)}
        handleSave={(_1, _2, _3, _4, _5, _6) => {
          backend.current.createUser(_2, _3, _4, _5, _6).then((newUser) => {
            setUserToEdit(null);
            setUsers([...users, newUser]);
          });
        }}
        user={null}
      />
    </>
  );
}
