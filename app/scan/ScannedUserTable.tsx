import ClearIcon from '@mui/icons-material/Clear';
import DeleteIcon from '@mui/icons-material/Delete';

import dayjs from 'dayjs';
import {
  DataGrid,
  GridColDef,
  GridActionsCellItem,
  GridToolbarContainer,
} from '@mui/x-data-grid';
import Button from '@mui/material/Button';
import { AppUser } from '@/lib/dto';

export type ScannedUser = {
  id: string;
  user: AppUser;
  scanDate: dayjs.Dayjs;
};

function buildColumns(
  handleDeleteUser: (id: string) => () => void,
): GridColDef[] {
  return [
    {
      headerName: 'Registrierung',
      field: 'scanDate',
      width: 200,
      valueFormatter: (value: dayjs.Dayjs) => value.format('DD.MM.YYYY (dd) HH:mm'),
    },
    {
      field: 'Vorname',
      valueGetter: (_value, row) => row.user.firstname,
    },
    { field: 'Nachname', valueGetter: (_value, row) => row.user.name },
    {
      field: 'actions',
      headerName: '',
      type: 'actions',
      getActions: ({ row }) => [
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="löschen"
          onClick={handleDeleteUser(row.id)}
          key="delete-checkin-button"
        />,
      ],
    },
  ];
}

type ScannedUserToolbarProps = {
  handleClear?: () => void;
};
declare module '@mui/x-data-grid' {
  // required for typechecking
  interface ToolbarPropsOverrides {
    handleClear?: () => void;
  }
}


function ScannedUserTableToolbar({ handleClear }: ScannedUserToolbarProps) {
  return (
    <GridToolbarContainer>
      <Button
        data-testid="clear-checkin-button"
        startIcon={<ClearIcon />}
        onClick={() => {
          if (handleClear) {
            handleClear()
          }
        }}
      >
        Liste leeren
      </Button>
    </GridToolbarContainer>
  );
}

type ScannedUserTableProps = {
  scannedUsers: ScannedUser[];
  handleDeleteUser: (id: string) => () => void;
  handleClearAll: () => void;
};

export function ScannedUserTable({
  scannedUsers,
  handleDeleteUser,
  handleClearAll,
}: ScannedUserTableProps) {
  return (
    <>
      <DataGrid
        rows={scannedUsers}
        columns={buildColumns(handleDeleteUser)}
        hideFooter
        slots={{ toolbar: ScannedUserTableToolbar }}
        slotProps={{
          toolbar: { handleClear: handleClearAll },
        }}
      />
    </>
  );
}
