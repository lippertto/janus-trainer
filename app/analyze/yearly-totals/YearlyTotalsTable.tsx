import { YearlyTotalDto } from '@/lib/dto';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Box from '@mui/material/Box';

function currencyFormatter(value: number) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function buildColumns(): GridColDef[] {
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
        if (params.row.compensationCentsTotal < 3000 * 100) {
          return '';
        } else {
          return 'yearly-total-warning';
        }
      },
    },
  ];
}

export default function YearlyTotalsTable(props: { totals: YearlyTotalDto[] }) {
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
        columns={buildColumns()}
      />
    </Box>
  );
}
