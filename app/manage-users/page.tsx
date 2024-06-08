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
import { TrainingDto, UserDto } from '@/lib/dto';
import { useConfirm } from 'material-ui-confirm';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_TRAININGS, API_USERS } from '@/lib/routes';
import Stack from '@mui/material/Stack';
import { CircularProgress } from '@mui/material';

export default function UserManagementPage() {
  const [showCreate, setShowCreate] = React.useState<boolean>(false);
  const [showEdit, setShowEdit] = React.useState<boolean>(false);
  const [users, setUsers] = React.useState<UserDto[]>([]);
  const [userToEdit, setUserToEdit] = React.useState<UserDto | null>(null);

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

  const usersResponse = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchListFromApi<UserDto>(
      `${API_USERS}`,
      session!.accessToken,
    ),
    throwOnError: true,
    enabled: Boolean(session?.accessToken),
    staleTime: 10 * 60 * 1000,
  });

  React.useEffect(() => {
    if (!usersResponse.isError && !usersResponse.isLoading) {
      setUsers(usersResponse.data!);
    }
  }, [usersResponse.data]);

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

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  if (usersResponse.isLoading || usersResponse.isRefetching) {
    return <Stack alignItems="center"><CircularProgress /> </Stack>;
  }

  return (
    <>
      <UserTable
        users={users ?? []}
        handleAddUser={() => setShowCreate(true)}
        handleRefresh={usersResponse.refetch}
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
