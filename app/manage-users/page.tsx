'use client';

import React from 'react';

import { useSession } from 'next-auth/react';

import UserTable from './UserTable';
import { EditUserDialog } from './EditUserDialog';
import { showError } from '@/lib/notifications';

import { GridRowId } from '@mui/x-data-grid';

import LoginRequired from '../../components/LoginRequired';
import type { JanusSession } from '@/lib/auth';

import { createUser, deleteUser, getAllUsers, updateUser } from '@/lib/api-users';
import { User } from '@/lib/dto';
import { useConfirm } from 'material-ui-confirm';

export default function UserManagementPage() {
  const [showCreate, setShowCreate] = React.useState<boolean>(false);
  const [showEdit, setShowEdit] = React.useState<boolean>(false);
  const [users, setUsers] = React.useState<User[]>([]);
  const [userToEdit, setUserToEdit] = React.useState<User | null>(null);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const confirm = useConfirm();
  const handleDeleteClick = (deleteMeId: GridRowId) => {
    const user = users.find((t) => t.id === deleteMeId);
    if (!user) return;
    confirm({
      title: 'Nutzer löschen?',
      description: `Soll der Nutzer "${user.email}" gelöscht werden?`,
    })
      .then(() =>
        deleteUser(session.accessToken, user.id)
          .then(() => {
            setUsers(users.filter((u) => u.id !== user.id));
          })
          .catch((err) => {
            showError(`Konnte Nutzer ${user.email} nicht löschen`, err.message);
          }));
  };


  const refresh = React.useCallback(async () => {
    setUserToEdit(null);
    setUsers([]);
    if (session?.accessToken) {
      getAllUsers(session.accessToken)
        .then((result) => {
          setUsers(result);
        })
        .catch((e: Error) => {
          showError('Konnte die Nutzer nicht laden', e.message);
        });
    }
  }, [session?.accessToken]);

  const handleUserEditClick = React.useCallback(
    (id: GridRowId) => {
      const user = users.find((t) => t.id === id);
      if (!user) {
        console.error(`Could not find user with id ${id}`);
      }
      setShowEdit(true);
      setUserToEdit(user ?? null);
    },
    [setShowEdit, setUserToEdit, users],
  );

  React.useEffect(() => {
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
        handleUserDeleteClick={handleDeleteClick}
      />

      {/* Dialog to edit users */}
      <EditUserDialog
        open={showEdit}
        handleClose={() => setShowEdit(false)}
        handleSave={(_1, _2, _3, _4, _5, _6) =>
          updateUser(session.accessToken, _1!, _2, _3, _4, _5, _6).then(
            (updatedUser) => {
              setUserToEdit(null);
              setUsers(
                users.map((u) => (u.id === userToEdit?.id ? updatedUser : u)),
              );
            },
          ).catch((e) => {
            showError('Konnte Nutzer nicht aktualisieren', e.message);
          })
        }
        user={userToEdit}
      />
      {/* Dialog to create users */}
      <EditUserDialog
        open={showCreate}
        handleClose={() => setShowCreate(false)}
        handleSave={(_1, _2, _3, _4, _5, _6) => {
          createUser(session.accessToken, _2, _3, _4, _5, _6)
            .then((newUser) => {
              setUserToEdit(null);
              setUsers([...users, newUser]);
            })
            .catch((e) => {
              showError('Konnte Nutzer nicht anlegen', e.message);
            });
        }}
        user={null}
      />
    </>
  );
}
