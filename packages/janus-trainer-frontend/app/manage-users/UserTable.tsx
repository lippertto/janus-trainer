import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarContainer,
} from '@mui/x-data-grid';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import type { User } from '../../lib/backend';
import React from 'react';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import PersonAddIcon from '@mui/icons-material/PersonAdd';

function UserTableToolbar({
  handleAddUser,
  handleRefresh,
}: {
  handleAddUser: () => void;
  handleRefresh: () => void;
}) {
  return (
    <GridToolbarContainer>
      <Button startIcon={<PersonAddIcon />} onClick={handleAddUser}>
        Nutzer hinzufügen
      </Button>
      <Button startIcon={<RefreshIcon />} onClick={handleRefresh}>
        Neu laden
      </Button>
    </GridToolbarContainer>
  );
}

export default function UserTable({
  users,
  handleAddUser,
  handleRefresh,
  handleUserEditClick,
}: {
  users: User[];
  handleAddUser: () => void;
  handleRefresh: () => void;
  handleUserEditClick: (id: GridRowId) => void;
}) {
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
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: '',
      flex: 0.5,
      getActions: ({ id }) => {
        return [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="bearbeiten"
            onClick={() => handleUserEditClick(id)}
            key={id}
          />,
        ];
      },
    },
  ];

  return (
    <DataGrid
      columns={columns}
      rows={users}
      slots={{
        toolbar: UserTableToolbar,
      }}
      slotProps={{ toolbar: { handleAddUser, handleRefresh } }}
      rowSelection={false}
    />
  );
}
