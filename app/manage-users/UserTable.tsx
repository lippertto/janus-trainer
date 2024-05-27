import {
  DataGrid,
  GridActionsCellItem,
  GridToolbarContainer,
} from '@mui/x-data-grid';
import type { GridColDef, GridRowId } from '@mui/x-data-grid';
import type { User } from '@/lib/dto';

import React from 'react';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import DeleteIcon from '@mui/icons-material/Delete';

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
      <Button startIcon={<PersonAddIcon />} onClick={handleAddUser} data-testid={"add-user-button"}>
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
  handleUserDeleteClick,
}: {
  users: User[];
  handleAddUser: () => void;
  handleRefresh: () => void;
  handleUserEditClick: (id: GridRowId) => void;
  handleUserDeleteClick: (id: GridRowId) => void;
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
      getActions: ({ id , row}) => {
        return [
          <GridActionsCellItem
            icon={<EditIcon />}
            label="bearbeiten"
            onClick={() => handleUserEditClick(id)}
            key={id}
          />,
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label="löschen"
            onClick={() => handleUserDeleteClick(id)}
            key={id}
            data-testid={`delete-user-${row.email}-button`}
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
