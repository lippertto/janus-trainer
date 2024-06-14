import { DataGrid, GridColDef, GridRowSelectionModel, GridToolbarContainer } from '@mui/x-data-grid';
import { UserCreateRequest, UserDto, UserUpdateRequest } from '@/lib/dto';

import React from 'react';

import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { JanusSession } from '@/lib/auth';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { createInApi, deleteFromApi, fetchListFromApi, updateInApi } from '@/lib/fetch';
import { API_USERS } from '@/lib/routes';
import { useConfirm } from 'material-ui-confirm';
import { showError, showSuccess } from '@/lib/notifications';
import { UserDialog } from './UserDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function UserTableToolbar(
  {
    handleAddUser,
    handleDeleteUser,
    handleEditUser,
    rowIsSelected,
  }: {
    handleAddUser: () => void;
    handleDeleteUser: () => void;
    handleEditUser: () => void;
    rowIsSelected: boolean
  }) {
  return (
    <GridToolbarContainer>
      <Button startIcon={<PersonAddIcon />} onClick={handleAddUser} data-testid={'add-user-button'}>
        hinzufügen
      </Button>
      <Button startIcon={<DeleteIcon />} onClick={handleDeleteUser}
              disabled={!Boolean(rowIsSelected)}
      >
        löschen
      </Button>
      <Button startIcon={<EditIcon />} onClick={handleEditUser}
              disabled={!Boolean(rowIsSelected)}
      >
        bearbeiten
      </Button>
    </GridToolbarContainer>
  );
}

export default function UserTable({
                                    session,
                                  }: {
  session: JanusSession;
}) {
  const [showUserDialog, setShowUserDialog] = React.useState(false);
  const queryClient = useQueryClient();
  const { data: users } = useSuspenseQuery({
    queryKey: ['users'],
    queryFn: () => fetchListFromApi<UserDto>(
      `${API_USERS}`,
      session!.accessToken,
    ),
    staleTime: 10 * 60 * 1000,
  });

  const createUserMutation = useMutation({
    mutationFn: (data: UserCreateRequest) => {
      return createInApi<UserDto>(API_USERS, data, session?.accessToken ?? '');
    },
    onSuccess: (createdUser: UserDto) => {
      queryClient.setQueryData(['users'], [...users, createdUser]);
      showSuccess(`Nutzer ${createdUser.name} wurde erstellt`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen des Nutzers`, e.message);
    },
  });

  const updateUserMutation = useMutation({
      mutationFn: (props: { data: UserUpdateRequest, userId: string }) => {
        return updateInApi<UserDto>(API_USERS, props.userId, props.data, session?.accessToken ?? '');
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
        showSuccess(`Nutzer ${data.name} wurde aktualisiert`);
      },
      onError: (e) => {
        showError(`Fehler beim Aktualisieren des Nutzers`, e.message);
      },
    },
  );

  const confirm = useConfirm();
  const handleDeleteUser = (user: UserDto | null) => {
    confirm({
      title: 'Nutzer löschen?',
      description: `Soll der Nutzer "${user?.email}" gelöscht werden?`,
    })
      .then(() => {
        if (!user) return;
        deleteFromApi(API_USERS, user, session.accessToken)
          .then((deleted) => {
            queryClient.setQueryData(['users'], users.filter((u) => u.id !== deleted.id));
            showSuccess(`Nutzer ${user.name} wurde gelöscht`);
          })
          .catch((err) => {
            showError(`Konnte Nutzer ${user.email} nicht löschen`, err.message);
          });
      })
    ;
  };

  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'E-Mail', flex: 1 },
    {
      field: 'groups',
      headerName: 'Gruppen',
      flex: 1,
      renderCell: (params) => (
        <Typography>{params.value?.join(', ')}</Typography>
      ),
    }];

  const [rowSelectionModel, setRowSelectionModel] = React.useState<GridRowSelectionModel>(
    [],
  );
  const [activeUser, setActiveUser] = React.useState<UserDto | null>(null);

  return (
    <React.Fragment>
      <DataGrid
        columns={columns}
        rows={users}
        slots={{
          toolbar: UserTableToolbar,
        }}
        slotProps={{
          toolbar: {
            handleAddUser: () => {
              setActiveUser(null);
              setShowUserDialog(true);
            },
            handleEditUser: () => {
              setShowUserDialog(true);
            },
            handleDeleteUser: () => handleDeleteUser(activeUser),
            rowIsSelected: activeUser !== null,
          },
        }}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={
          (newValue) => {
            if (newValue.length === 0) {
              setActiveUser(null);
            } else {
              setActiveUser(
                users.find((u) => (u?.id === newValue[0] as string)) ??
                null,
              )
              ;
            }
            setRowSelectionModel(newValue);
          }
        }
      />
      <UserDialog
        userToEdit={activeUser}
        open={showUserDialog}
        handleClose={() => {
          setActiveUser(null);
          setShowUserDialog(false);
        }}
        handleSave={(request: UserCreateRequest) => {
          if (activeUser) {
            updateUserMutation.mutate({ userId: activeUser.id, data: request });
          } else {
            createUserMutation.mutate(request);
          }
        }}
      />
    </React.Fragment>
  );
}
