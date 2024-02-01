'use client';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '../../lib/auth';
import LoginRequired from '../../components/LoginRequired';
import UserTable from './UserTable';
import React from 'react';
import { Backend, type User } from '../../lib/backend';
import { type GridRowSelectionModel } from '@mui/x-data-grid';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import { EditUserDialog } from './EditUserDialog';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

export default function UserManagementPage() {
  const backend = React.useRef<Backend>(new Backend());

  const [showEdit, setShowEdit] = React.useState<boolean>(false);
  const [showCreate, setShowCreate] = React.useState<boolean>(false);
  const [users, setUsers] = React.useState<User[]>([]);
  const [selectedRows, setSelectedRows] = React.useState<GridRowSelectionModel>(
    [],
  );
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const refresh = React.useCallback(async () => {
    setUsers([]);
    if (session?.accessToken) {
      backend.current.getAllUsers().then((result) => {
        setUsers(result);
      });
    }
  }, [session?.accessToken]);

  React.useEffect(() => {
    backend.current.setAccessToken(session?.accessToken);
    refresh();
  }, [session?.accessToken, refresh]);

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <>
      <Grid container spacing={2}>
        <Grid xsOffset={'auto'}>
          <Button onClick={refresh} endIcon={<RefreshIcon />}>
            Neu laden
          </Button>
        </Grid>
        <Grid xs={12}>
          <UserTable
            users={users}
            selectedRow={selectedRows}
            setSelectedRow={setSelectedRows}
            handleEdit={() => {
              setShowEdit(true);
            }}
            listenToClickAways={!showEdit && !showCreate}
          />
        </Grid>
        <Grid xsOffset={'auto'}>
          <Button
            onClick={() => {
              setShowCreate(true);
            }}
            endIcon={<PersonAddIcon />}
          >
            Neuer Nutzer
          </Button>
        </Grid>
      </Grid>
      <EditUserDialog
        open={showEdit}
        handleClose={() => setShowEdit(false)}
        handleSave={(_1, _2, _3, _4, _5, _6) =>
          backend.current
            .updateUser(_1, _2, _3, _4, _5, _6)
            .then(() => refresh())
        }
        user={
          selectedRows.length === 0
            ? undefined
            : users.find((t) => t.id === selectedRows[0])
        }
      />
      <EditUserDialog
        open={showCreate}
        handleClose={() => setShowCreate(false)}
        handleSave={(_1, _2, _3, _4, _5, _6) =>
          backend.current.createUser(_2, _3, _4, _5, _6).then(() => refresh())
        }
        user={undefined}
      />
    </>
  );
}
