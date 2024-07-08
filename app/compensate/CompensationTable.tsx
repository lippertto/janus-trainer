import { DataGrid, GridActionsCellItem, GridColDef, GridRowParams, GridToolbar } from '@mui/x-data-grid';
import React from 'react';
import { CompensationDto, UserDto } from '@/lib/dto';
import { centsToHumanReadable, ibanToHumanReadable } from '@/lib/formatters';
import LaunchIcon from '@mui/icons-material/Launch';
import { useRouter } from 'next/navigation';
import dayjs from 'dayjs';

export default function CompensationTable({
                                            compensations,
                                          }: {
  compensations: CompensationDto[];
}) {
  const { push } = useRouter();

  const columns: GridColDef[] = [
    {
      field: 'user',
      headerName: 'Name',
      flex: 2,
      valueGetter: (value: UserDto) => value.name,
    },
    {
      field: 'totalTrainings',
      headerName: 'Trainings',
      flex: 0.5,
    },
    {
      field: 'totalCompensationCents',
      headerName: 'Betrag',
      valueFormatter: (value: number) => {
        return centsToHumanReadable(value);
      },
      flex: 1,
    },
    {
      field: 'iban',
      headerName: 'IBAN',
      flex: 2,
      valueGetter: (_value, row) => ibanToHumanReadable(row.user.iban),
    },
    {
      field: 'actions',
      headerName: '',
      flex: 0.5,
      type: 'actions',
      getActions: (params: GridRowParams<CompensationDto>) => ([
        <GridActionsCellItem icon={<LaunchIcon />} onClick={() => {
          push(`approve?startDate=${params.row.periodStart}&endDate=${params.row.periodEnd}&trainerId=${params.row.user.id}`)
        }} label="Ansehen" />,
      ]),
    },
  ];

  return (
    <DataGrid
      slots={{toolbar: GridToolbar }}
      slotProps={{toolbar: {csvOptions: {fileName: `${dayjs().format('YYYY-MM-DD')} Pauschalen-Export.csv`}}}}
      columns={columns}
      rows={compensations}
      getRowId={(c: CompensationDto) => c.user.id}
    />
  );
}
