import { DataGrid, GridActionsCellItem, GridColDef, GridRowParams } from '@mui/x-data-grid';
import React from 'react';
import { CompensationDto, UserDto } from '@/lib/dto';
import { centsToHumanReadable } from '@/lib/formatters';
import LaunchIcon from '@mui/icons-material/Launch';
import { useRouter } from 'next/navigation';

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
      valueGetter: (_value, row) => row.user.iban.replace(/(.{4})/g, '$1 ').trim(),
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
      columns={columns}
      rows={compensations}
      getRowId={(c: CompensationDto) => c.user.id}
    />
  );
}
