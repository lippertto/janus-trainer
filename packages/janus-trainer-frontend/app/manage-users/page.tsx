'use client';

import React from 'react';

import { useSession } from 'next-auth/react';

import UserTable from './UserTable';
import { EditUserDialog } from './EditUserDialog';
import { showError } from '@/lib/notifications';

import { GridRowId } from '@mui/x-data-grid';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import LoginRequired from '../../components/LoginRequired';
import type { JanusSession } from '../../lib/auth';
import { type User } from '../../lib/backend';

import {
  createUser,
  deleteUser,
  getAllUsers,
  updateUser,
} from '../../lib/api-users';

function DeleteUserDialog({
  open,
  handleClose,
  user,
  handleDeleteClick,
}: {
  open: boolean;
  handleClose: () => void;
  user: User | null;
  handleDeleteClick: () => void;
}) {
  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Nutzer löschen</DialogTitle>
      <DialogContent>
        <Typography>
          Soll {user?.name} mit der Email-adresse {user?.email} gelöscht werden?
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDeleteClick} color="error">
          Löschen
        </Button>
        <Button onClick={handleClose}>Abbrechen</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function UserManagementPage() {
  const [showCreate, setShowCreate] = React.useState<boolean>(false);
  const [showDelete, setShowDelete] = React.useState<boolean>(false);
  const [showEdit, setShowEdit] = React.useState<boolean>(false);
  const [users, setUsers] = React.useState<User[]>([]);
  const [userToEdit, setUserToEdit] = React.useState<User | null>(null);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

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

  const handleUserDeleteClick = React.useCallback(
    (id: GridRowId) => {
      const user = users.find((t) => t.id === id);
      if (!user) {
        console.error(`Could not find user with id ${id}`);
        setUserToEdit(null);
        return;
      } else {
        setUserToEdit(user);
        setShowDelete(true);
      }
    },
    [users, setUserToEdit],
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
        handleUserDeleteClick={handleUserDeleteClick}
      />

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
          )
        }
        user={userToEdit}
      />
      <EditUserDialog
        open={showCreate}
        handleClose={() => setShowCreate(false)}
        handleSave={(_1, _2, _3, _4, _5, _6) => {
          createUser(session.accessToken, _2, _3, _4, _5, _6).then(
            (newUser) => {
              setUserToEdit(null);
              setUsers([...users, newUser]);
            },
          );
        }}
        user={null}
      />
      <DeleteUserDialog
        open={showDelete}
        handleClose={() => setShowDelete(false)}
        user={userToEdit}
        handleDeleteClick={() => {
          if (userToEdit) {
            deleteUser(session.accessToken, userToEdit.id).then(() => {
              setUsers(users.filter((u) => u.id !== userToEdit.id));
            });
          }
          setUserToEdit(null);
          setShowDelete(false);
        }}
      />
    </>
  );
}
