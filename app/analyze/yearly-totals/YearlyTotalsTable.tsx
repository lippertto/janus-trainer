import { TrainingStatisticDto } from '@/lib/dto';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';
import { currencyFormatter } from '@/lib/formatters';

function buildColumns(maxCentsPerYear: number): GridColDef[] {
  const compensationCentsWidth = 100; // allows to show 1000,00 €
  const trainingCountWidth = 50;
  return [
    { field: 'trainerName', headerName: 'Übungsleitung', width: 200 },
    { field: 'trainingCountQ1', headerName: 'Q1 T', width: trainingCountWidth },
    { field: 'trainingCountQ2', headerName: 'Q2 T', width: trainingCountWidth },
    { field: 'trainingCountQ3', headerName: 'Q3 T', width: trainingCountWidth },
    { field: 'trainingCountQ4', headerName: 'Q4 T', width: trainingCountWidth },
    {
      field: 'trainingCountTotal',
      headerName: 'Σ T',
      width: trainingCountWidth,
    },
    {
      field: 'compensationCentsQ1',
      headerName: 'Q1 €',
      width: compensationCentsWidth,
      valueGetter: (value) => value / 100,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'compensationCentsQ2',
      headerName: 'Q2 €',
      width: compensationCentsWidth,
      valueGetter: (value) => value / 100,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'compensationCentsQ3',
      headerName: 'Q3 €',
      width: compensationCentsWidth,
      valueGetter: (value) => value / 100,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'compensationCentsQ4',
      headerName: 'Q4 €',
      width: compensationCentsWidth,
      valueGetter: (value) => value / 100,
      valueFormatter: currencyFormatter,
    },
    {
      field: 'compensationCentsTotal',
      headerName: 'Σ €',
      type: 'number',
      width: compensationCentsWidth,
      valueGetter: (value) => value / 100,
      valueFormatter: currencyFormatter,
      cellClassName: (params) => {
        if (params.row.compensationCentsTotal < maxCentsPerYear) {
          return '';
        } else {
          return 'yearly-total-warning';
        }
      },
    },
  ];
}

export default function YearlyTotalsTable(props: {
  totals: TrainingStatisticDto[];
  maxCentsPerYear: number;
}) {
  return (
    <Box
      sx={{
        '.yearly-total-warning': {
          backgroundColor: '#ff943975',
        },
      }}
    >
      <DataGrid
        rows={props.totals}
        getRowId={(row) => row.trainerId}
        disableRowSelectionOnClick
        columns={buildColumns(props.maxCentsPerYear)}
      />
    </Box>
  );
}
