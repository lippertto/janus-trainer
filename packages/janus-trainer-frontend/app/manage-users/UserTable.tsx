import { DataGrid } from '@mui/x-data-grid';
import type {
  GridColDef,
  GridRenderEditCellParams,
  GridRowId,
  GridRowSelectionModel,
} from '@mui/x-data-grid';
import type { User } from '../../lib/backend';
import React from 'react';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Typography from '@mui/material/Typography';

function renderActionCell(
  params: GridRenderEditCellParams,
  selectedRow: GridRowId[],
  handleEdit: () => void,
) {
  if (selectedRow.length === 0) return <></>;
  if (selectedRow[0] !== params.id) return <></>;

  return (
    <>
      <IconButton onClick={handleEdit}>
        <EditIcon />
      </IconButton>
    </>
  );
}

export default function UserTable({
  users,
  selectedRow,
  setSelectedRow,
  handleEdit,
  listenToClickAways,
}: {
  users: User[];
  selectedRow: GridRowId[];
  setSelectedRow: (v: GridRowSelectionModel) => void;
  handleEdit: () => void;
  listenToClickAways: boolean;
}) {
  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'E-Mail', flex: 1 },
    {
      field: 'groups',
      headerName: 'Gruppen',
      flex: 1,
      renderCell: (params) => (
        <Typography>{params.value.join(', ')}</Typography>
      ),
    },
    {
      field: 'actions',
      headerName: '',
      renderCell: (params) => renderActionCell(params, selectedRow, handleEdit),
      flex: 0.5,
    },
  ];

  return (
    <ClickAwayListener
      onClickAway={() => {
        if (listenToClickAways) {
          setSelectedRow([]);
        }
      }}
    >
      <DataGrid
        columns={columns}
        rows={users}
        onRowSelectionModelChange={(newRowSelectionModel) => {
          setSelectedRow(newRowSelectionModel);
        }}
        rowSelectionModel={selectedRow}
      />
    </ClickAwayListener>
  );
}
