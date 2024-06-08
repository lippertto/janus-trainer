import { DataGrid, GridColDef } from '@mui/x-data-grid';
import React from 'react';
import { CompensationDto } from '@/lib/dto';
import { centsToDisplayString } from '@/lib/formatters';

export default function CompensationTable({
  compensations,
}: {
  compensations: CompensationDto[];
}) {
  const columns: GridColDef[] = [
    {
      field: 'user',
      headerName: 'Name',
      flex: 2,
      valueGetter: (p) => p.value.name,
    },
    {
      field: 'totalTrainings',
      headerName: 'Trainings',
      flex: 0.5,
    },
    {
      field: 'totalCompensationCents',
      headerName: 'Betrag',
      valueFormatter: (params) => {
        return centsToDisplayString(params.value);
      },
      flex: 1,
    },
    {
      field: 'iban',
      headerName: 'IBAN',
      flex: 2,
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
