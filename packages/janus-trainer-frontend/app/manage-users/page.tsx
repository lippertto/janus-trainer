'use client';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '../../lib/auth';
import LoginRequired from '../../components/LoginRequired';
import UserTable from './UserTable';
import React from 'react';
import { Backend, type User } from '../../lib/backend';
import { type GridRowSelectionModel } from '@mui/x-data-grid';
import { EditUserDialog } from './EditUserDialog';

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
      <UserTable
        users={users}
        selectedRow={selectedRows}
        setSelectedRow={setSelectedRows}
        handleEdit={() => {
          setShowEdit(true);
        }}
        listenToClickAways={!showEdit && !showCreate}
        handleAddUser={() => setShowCreate(true)}
        handleRefresh={refresh}
      />

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
