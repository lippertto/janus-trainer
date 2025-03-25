import { CostCenterDto } from '@/lib/dto';
import { DataGrid, GridColDef, GridEventListener } from '@mui/x-data-grid';
import React from 'react';
import Box from '@mui/system/Box';

function buildColumns(): GridColDef<CostCenterDto>[] {
  return [
    { field: 'name', headerName: 'Name' },
    { field: 'costCenterId', headerName: 'Kostenstelle' },
    {
      field: 'deletedAt',
      headerName: 'gelöscht',
      type: 'boolean',
      width: 150,
      valueGetter: (field: string) => Boolean(field),
    },
  ];
}

export default function CostCenterTable(props: {
  costCenters: CostCenterDto[];
  activeCostCenter: CostCenterDto | null;
  setActiveCostCenter: (v: CostCenterDto) => void;
}) {
  const handleRowClick: GridEventListener<'rowClick'> = (params) => {
    props.setActiveCostCenter(params.row);
  };

  const columns = React.useMemo(() => buildColumns(), [props.costCenters]);

  return (
    <Box component="div" overflow="auto" sx={{ height: 'calc(100vh - 320px)' }}>
      <DataGrid
        rows={props.costCenters}
        getRowId={(row) => row.id}
        columns={columns}
        onRowClick={handleRowClick}
        initialState={{
          sorting: {
            sortModel: [{ field: 'name', sort: 'asc' }],
          },
          filter: {
            filterModel: {
              // items: []
              items: [{ field: 'deletedAt', operator: 'is', value: false }],
            },
          },
        }}
        autosizeOnMount={true}
        autosizeOptions={{ includeOutliers: true }}
      />
    </Box>
  );
}
