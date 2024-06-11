import { DataGrid, GridColDef, GridRowSelectionModel, GridToolbarContainer } from '@mui/x-data-grid';
import { UserCreateRequest, UserDto, UserUpdateRequest } from '@/lib/dto';

import React from 'react';
import RefreshIcon from '@mui/icons-material/Refresh';

import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { JanusSession } from '@/lib/auth';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createInApi, deleteFromApi, fetchListFromApi, updateInApi } from '@/lib/fetch';
import { API_USERS } from '@/lib/routes';
import Stack from '@mui/material/Stack';
import { CircularProgress } from '@mui/material';
import { useConfirm } from 'material-ui-confirm';
import { showError, showSuccess } from '@/lib/notifications';
import { UserDialog } from './UserDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function UserTableToolbar(
  {
    handleAddUser,
    handleRefresh,
    handleDeleteUser,
    handleEditUser,
    rowIsSelected,
  }: {
    handleAddUser: () => void;
    handleRefresh: () => void;
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
      <Button startIcon={<RefreshIcon />} onClick={handleRefresh}>
        Neu laden
      </Button>
    </GridToolbarContainer>
  );
}

export default function UserTable({
                                    session,
                                  }: {
  session: JanusSession;
}) {
  const [users, setUsers] = React.useState<UserDto[]>([]);
  const [showUserDialog, setShowUserDialog] = React.useState(false);

  const usersResult = useQuery({
    queryKey: ['users'],
    queryFn: () => fetchListFromApi<UserDto>(
      `${API_USERS}`,
      session!.accessToken,
    ),
    throwOnError: true,
    enabled: Boolean(session?.accessToken),
    staleTime: 10 * 60 * 1000,
  });

  const createUserMutation = useMutation({
    mutationFn: (data: UserCreateRequest) => {
      return createInApi<UserDto>(API_USERS, data, session?.accessToken ?? '');
    },
    onSuccess: (createdUser: UserDto) => {
      setUsers([...users, createdUser]);
      showSuccess(`Nutzer ${createdUser.name} wurdeerstellt`);
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
        setUsers(newUsers);
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
            setUsers(users.filter((u) => u.id !== deleted.id));
            showSuccess(`Nutzer ${user.name} wurde gelöscht`);
          })
          .catch((err) => {
            showError(`Konnte Nutzer ${user.email} nicht löschen`, err.message);
          });
      })
    ;
  };

  React.useEffect(() => {
    if (!usersResult.isError && !usersResult.isLoading) {
      setUsers(usersResult.data!);
    }
  }, [usersResult.data]);


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

  if (usersResult.isLoading || usersResult.isRefetching) {
    return <Stack alignItems="center"><CircularProgress /> </Stack>;
  }

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
            handleRefresh: usersResult.refetch,
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
            updateUserMutation.mutate({userId: activeUser.id, data: request})
          } else {
            createUserMutation.mutate(request);
          }
        }}
      />
    </React.Fragment>
  );
}
