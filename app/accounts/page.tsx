'use client';

import React from 'react';

import { useSession } from 'next-auth/react';

import UserTable from './UserTable';

import LoginRequired from '../../components/LoginRequired';
import type { JanusSession } from '@/lib/auth';
import Stack from '@mui/system/Stack';
import UserButtonGroup from '@/app/accounts/UserButtonGroup';
import { UserCreateRequest, UserDto, UserUpdateRequest } from '@/lib/dto';
import { UserDialog } from '@/app/accounts/UserDialog';
import { compensationClassesSuspenseQuery } from '@/lib/shared-queries';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import {
  createInApi,
  deleteFromApi,
  fetchListFromApi,
  updateInApi,
} from '@/lib/fetch';
import { API_USERS } from '@/lib/routes';
import { showError, showSuccess } from '@/lib/notifications';
import { useConfirm } from 'material-ui-confirm';
import { queryUsers } from '@/app/accounts/queries';
import { Typography } from '@mui/material';
import Paper from '@mui/material/Paper';

function UserManagementContents(props: { accessToken: string }) {
  const queryClient = useQueryClient();

  const [activeUser, setActiveUser] = React.useState<UserDto | null>(null);
  const [showUserDialog, setShowUserDialog] = React.useState(false);

  const createUserMutation = useMutation({
    mutationFn: (data: UserCreateRequest) => {
      return createInApi<UserDto>(API_USERS, data, props.accessToken ?? '');
    },
    onSuccess: (createdUser: UserDto) => {
      queryClient.setQueryData(['users'], [...users, createdUser]);
      showSuccess(`Konto für ${createdUser.name} wurde erstellt`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen des Kontos`, e.message);
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: ({
      userId,
      data,
    }: {
      data: UserUpdateRequest;
      userId: string;
    }) => {
      return updateInApi<UserDto>(
        API_USERS,
        userId,
        data,
        props.accessToken ?? '',
      );
    },
    onSuccess: (data: UserDto) => {
      const newUsers = users.map((u) => {
        if (u.id === data.id) {
          return data;
        } else {
          return u;
        }
      });
      queryClient.setQueryData(['users'], newUsers);
      showSuccess(`Konto für ${data.name} wurde aktualisiert`);
    },
    onError: (e) => {
      showError(`Fehler beim Aktualisieren des Kontos`, e.message);
    },
  });

  const confirm = useConfirm();
  const handleDeleteUser = (user: UserDto | null) => {
    confirm({
      title: 'Konto löschen?',
      description: `Soll der Konto "${user?.email}" gelöscht werden?`,
    }).then(() => {
      if (!user) return;
      deleteFromApi(API_USERS, user, props.accessToken)
        .then((deleted) => {
          queryClient.setQueryData(
            ['users'],
            users.filter((u) => u.id !== deleted.id),
          );
          showSuccess(`Konto ${user.name} wurde gelöscht`);
        })
        .catch((err) => {
          showError(`Konnte Konto ${user.email} nicht löschen`, err.message);
        });
    });
  };

  const { data: compensationClasses } = compensationClassesSuspenseQuery(
    props.accessToken,
  );

  const { data: users } = queryUsers(props.accessToken);

  return (
    <>
      <Paper sx={{ padding: 3 }}>
        <Stack spacing={2}>
          <Typography variant={'h5'}>Nutzerkonten</Typography>

          <UserButtonGroup
            handleAddUser={() => {
              setActiveUser(null);
              setShowUserDialog(true);
            }}
            handleEditUser={() => setShowUserDialog(true)}
            handleDeleteUser={() => handleDeleteUser(activeUser)}
            anyUserIsActive={Boolean(activeUser)}
          />
          <UserTable users={users} setActiveUser={setActiveUser} />
        </Stack>
        <UserDialog
          accessToken={props.accessToken}
          toEdit={activeUser}
          compensationClasses={compensationClasses}
          open={showUserDialog}
          handleClose={() => {
            setActiveUser(null);
            setShowUserDialog(false);
          }}
          handleSave={(request: UserCreateRequest) => {
            if (activeUser) {
              updateUserMutation.mutate({
                userId: activeUser.id,
                data: request,
              });
            } else {
              createUserMutation.mutate(request);
            }
          }}
        />
      </Paper>
    </>
  );
}

export default function UserManagementPage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <UserManagementContents accessToken={session.accessToken} />;
}
