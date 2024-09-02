'use client';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import React, { useState } from 'react';
import { countPerCourseSuspenseQuery } from '@/lib/shared-queries';
import Stack from '@mui/material/Stack';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { TrainingCountPerCourse } from '@/lib/dto';
import Box from '@mui/material/Box';
import { DataGrid } from '@mui/x-data-grid';


const MAX_TRAININGS_PER_COURSE = 44;

function Table(props: {
  counts: TrainingCountPerCourse[]
}) {
  return <Box
    sx={{
      '.training-count-warning': {
        backgroundColor: '#ff943975',
      },
    }}
  >
    <DataGrid
      rows={props.counts}
      getRowId={(row) => (row.course.id)}
      disableRowSelectionOnClick
      columns={[
        { field: 'course.name', headerName: 'Kurs', width: 200, valueGetter: (_value, row) => row.course.name },
        {
          field: 'count', headerName: 'Anzahl', type: 'number',
          cellClassName: (params) => {
            if (params.row.count <= MAX_TRAININGS_PER_COURSE) {
              return '';
            } else {
              return 'training-count-warning';
            }
          },
        },
      ]}
    />
  </Box>;
}

function Contents(props: { accessToken: string }) {
  let currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);

  const { data: yearlySummaries } = countPerCourseSuspenseQuery(props.accessToken, year);

  return <Stack>
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

    <Table counts={yearlySummaries} />
  </Stack>;
}

export default function CountPerCoursePage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <Contents
    accessToken={session.accessToken}
  />;
}