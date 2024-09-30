import { DataGrid, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid';
import { UserDto } from '@/lib/dto';

import React from 'react';
import { JanusSession } from '@/lib/auth';
import Box from '@mui/system/Box';

export default function UserTable(props: {
  users: UserDto[];
  setActiveUser: (v: UserDto | null) => void;
}) {
  const columns: GridColDef[] = [
    { field: 'name', headerName: 'Name', flex: 1 },
    { field: 'email', headerName: 'E-Mail', flex: 1 },
  ];

  const [rowSelectionModel, setRowSelectionModel] =
    React.useState<GridRowSelectionModel>([]);

  return (
    <Box component="div" overflow="auto" sx={{ height: 'calc(100vh - 320px)' }}>
      <DataGrid
        columns={columns}
        rows={props.users}
        initialState={{
          sorting: {
            sortModel: [{ field: 'name', sort: 'asc' }],
          },
        }}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={(newValue) => {
          if (newValue.length === 0) {
            props.setActiveUser(null);
          } else {
            props.setActiveUser(
              props.users.find((u) => u?.id === (newValue[0] as string)) ??
                null,
            );
          }
          setRowSelectionModel(newValue);
        }}
      />
    </Box>
  );
}
