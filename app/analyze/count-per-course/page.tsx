'use client';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import React, { useState } from 'react';
import { trainingStatisticsSuspenseQuery } from '@/lib/shared-queries';
import Stack from '@mui/material/Stack';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { TrainingStatisticDto } from '@/lib/dto';
import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';
import { currencyFormatter } from '@/lib/formatters';

function Table(props: { totals: TrainingStatisticDto[] }) {
  const compensationCentsWidth = 100; // allows to show 1000,00 €
  const trainingCountWidth = 50;

  return (
    <Box
      sx={{
        '.training-count-warning': {
          backgroundColor: '#ff943975',
        },
      }}
    >
      <DataGrid
        rows={props.totals}
        getRowId={(row) => row.costCenterName!}
        disableRowSelectionOnClick
        columns={[
          {
            field: 'course.name',
            headerName: 'Kurs',
            width: 200,
            valueGetter: (_value, row) => row.costCenterName,
          },
          {
            field: 'trainingCountQ1',
            headerName: 'Q1 T',
            width: trainingCountWidth,
          },
          {
            field: 'trainingCountQ2',
            headerName: 'Q2 T',
            width: trainingCountWidth,
          },
          {
            field: 'trainingCountQ3',
            headerName: 'Q3 T',
            width: trainingCountWidth,
          },
          {
            field: 'trainingCountQ4',
            headerName: 'Q4 T',
            width: trainingCountWidth,
          },
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
        ]}
      />
    </Box>
  );
}

function Contents(props: { accessToken: string }) {
  let currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);

  const { data: yearlySummaries } = trainingStatisticsSuspenseQuery(
    props.accessToken,
    year,
    null,
    'cost-center',
  );

  return (
    <Stack>
      <DatePicker
        views={['year']}
        label="Jahr"
        value={dayjs(`${year}-01-01`)}
        minDate={dayjs(`2023-01-01`)}
        maxDate={dayjs(`${currentYear}-01-01`)}
        onChange={(value) => {
          if (!value) return;
          setYear(value.year());
        }}
        sx={{ mb: 3, width: 140 }}
      />
      <Table totals={yearlySummaries} />
    </Stack>
  );
}

export default function CountPerCoursePage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <Contents accessToken={session.accessToken} />;
}
