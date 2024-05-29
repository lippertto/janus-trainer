import { DataGrid, GridColDef } from '@mui/x-data-grid';
import React from 'react';
import { CompensationDto } from '@/lib/dto';

export default function CompensationTable({
  compensations,
}: {
  compensations: CompensationDto[];
}) {
  const columns: GridColDef[] = [
    {
      field: 'user',
      headerName: 'Name',
      width: 120,
      valueGetter: (p) => p.value.name,
    },
    {
      field: 'totalTrainings',
      headerName: 'Trainings',
    },
    {
      field: 'totalCompensationCents',
      headerName: 'Betrag',
      valueFormatter: (params) => {
        return Number(params.value / 100).toLocaleString() + ' €';
      },
    },
    {
      field: 'iban',
      headerName: 'IBAN',
      width: 250,
      valueGetter: (p) => p.row.user.iban.replace(/(.{4})/g, '$1 ').trim(),
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
