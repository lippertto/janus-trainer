import { YearlyTotalDto } from '@/lib/dto';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { centsToHumanReadable } from '@/lib/formatters';
import Box from '@mui/material/Box';

function buildColumns(): GridColDef[] {
  const compensationCentsWidth = 100; // allows to show 1000,00 €
  const trainingCountWidth = 50;
  return [
    { field: 'trainerName', headerName: 'Übungsleitung', width: 200 },
    { field: 'trainingCountQ1', headerName: 'Q1 T', width: trainingCountWidth },
    { field: 'trainingCountQ2', headerName: 'Q2 T', width: trainingCountWidth },
    { field: 'trainingCountQ3', headerName: 'Q3 T', width: trainingCountWidth },
    { field: 'trainingCountQ4', headerName: 'Q4 T', width: trainingCountWidth },
    { field: 'trainingCountTotal', headerName: 'Σ T', width: trainingCountWidth },
    { field: 'compensationCentsQ1', headerName: 'Q1 €', width: compensationCentsWidth, valueGetter: centsToHumanReadable },
    { field: 'compensationCentsQ2', headerName: 'Q2 €', width: compensationCentsWidth, valueGetter: centsToHumanReadable },
    { field: 'compensationCentsQ3', headerName: 'Q3 €', width: compensationCentsWidth, valueGetter: centsToHumanReadable },
    { field: 'compensationCentsQ4', headerName: 'Q4 €', width: compensationCentsWidth, valueGetter: centsToHumanReadable },
    {
      field: 'compensationCentsTotal', headerName: 'Σ €', width: compensationCentsWidth, valueGetter: centsToHumanReadable,
      cellClassName: (params) => {
        if (params.row.compensationCentsTotal < 3000 * 100) {
          return '';
        } else {
          return 'yearly-total-warning'
        }
      }
    },
  ];
}

export default function YearlyTotalsTable(props: {
  totals: YearlyTotalDto[]
}) {
  return <Box
    sx={{
      '.yearly-total-warning': {
        backgroundColor: '#ff943975',
      },
    }}
  >
    <DataGrid
      rows={props.totals}
      getRowId={(row) => (row.trainerId)}
      disableRowSelectionOnClick
      columns={buildColumns()}
    />
  </Box>;
}