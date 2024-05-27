'use client';
import React, { useEffect } from 'react';
import Stack from '@mui/system/Stack';
import TrainingTable from '@/components/TrainingTable';
import DeleteIcon from '@mui/icons-material/Delete';
import FastRewindIcon from '@mui/icons-material/FastRewind';
import FastForwardIcon from '@mui/icons-material/FastForward';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import Typography from '@mui/material/Typography';
import dayjs from 'dayjs';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import { DatePicker } from '@mui/x-date-pickers';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import { CompensationValue, Discipline, Holiday } from '@prisma/client';
import { TrainingDtoNew } from '@/lib/dto';
import { useQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_COMPENSATION_VALUES, API_DISCIPLINES, API_HOLIDAYS, API_TRAININGS } from '@/lib/routes';

dayjs.extend(quarterOfYear);

export default function ApprovePage(): React.ReactElement {
  const [startDate, setStartDate] = React.useState<dayjs.Dayjs | null>(
    dayjs().startOf('quarter'),
  );
  const [endDate, setEndDate] = React.useState<dayjs.Dayjs | null>(
    dayjs().endOf('quarter'),
  );
  const [trainings, setTrainings] = React.useState<TrainingDtoNew[]>([]);
  const [disciplines, setDisciplines] = React.useState<Discipline[]>([]);
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const trainingResult = useQuery({
    queryKey: ['trainings', startDate, endDate],
    queryFn: () => fetchListFromApi<TrainingDtoNew>(
      `${API_TRAININGS}?start=${startDate!.format('YYYY-MM-DD')}&end=${endDate!.format('YYYY-MM-DD')}`,
      session.accessToken,
    ),
    throwOnError: true,
    enabled: (!!session?.accessToken && startDate?.isValid() && endDate?.isValid()),
    initialData: [],
  });

  const holidayResult = useQuery({
    queryKey: ['holidays'],
    queryFn: () => fetchListFromApi<Holiday>(
      `${API_HOLIDAYS}?year=${new Date().getFullYear()},${new Date().getFullYear() - 1}`,
      session.accessToken,
    ),
    throwOnError: true,
    enabled: !!session?.accessToken,
    initialData: [],
  });

  const compensationValuesResult = useQuery({
    queryKey: ['compensationValues'],
    queryFn: () => fetchListFromApi<CompensationValue>(
      API_COMPENSATION_VALUES,
      session.accessToken),
    throwOnError: true,
    enabled: !!session?.accessToken,
    initialData: [],
  });

  const disciplineResult = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => fetchListFromApi<Discipline>(
      API_DISCIPLINES,
      session.accessToken,
    ),
    throwOnError: true,
    enabled: !!session?.accessToken,
    initialData: [],
  });

  useEffect(() => {
    if (!holidayResult.isError && !holidayResult.isLoading) {
      setHolidays(holidayResult.data);
    }
  }, [holidayResult]);

  useEffect(() => {
    if (!disciplineResult.isLoading && !disciplineResult.isError) {
      setDisciplines(disciplineResult.data);
    }
  }, [disciplineResult]);

  useEffect(() => {
    if (!trainingResult.isError && !trainingResult.isLoading) {
      setTrainings(trainingResult.data);
    }
  }, [trainingResult]);

  // refresh when the dates have changed
  useEffect(() => {
    trainingResult.refetch()
  }, [startDate, endDate]);


  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <Grid container spacing={2}>
      <Grid display="flex" alignItems="center">
        <ButtonGroup>
          <Button
            onClick={() => {
              setStartDate(dayjs().startOf('quarter'));
              setEndDate(dayjs().endOf('quarter'));
            }}
          >
            aktuelles Quartal
          </Button>
          <Button
            onClick={() => {
              setStartDate(dayjs().subtract(1, 'quarter').startOf('quarter'));
              setEndDate(dayjs().subtract(1, 'quarter').endOf('quarter'));
            }}
          >
            letztes Quartal
          </Button>
        </ButtonGroup>
      </Grid>
      <Grid xs={2}>
        <DatePicker
          label="Start"
          value={startDate}
          onChange={(v) => {
            setStartDate(v);
          }}
        />
      </Grid>
      <Grid xs={2}>
        <DatePicker
          label="Ende"
          value={endDate}
          onChange={(v) => {
            setEndDate(v);
          }}
        />
      </Grid>

      <Grid xs={12}>
        <TrainingTable
          trainings={trainings}
          disciplines={disciplines}
          holidays={holidays}
          compensationValues={compensationValuesResult.data}
          setTrainings={setTrainings}
          refresh={() => {
            holidayResult.refetch()
            disciplineResult.refetch()
            trainingResult.refetch()
          }}
          approvalMode={true}
        />
      </Grid>
      <Grid>
        <Stack direction="row" justifyContent="end" gap={1}>
          <FastForwardIcon />
          <Typography>= Freigeben </Typography>
          <FastRewindIcon />
          <Typography>= Freigabe rückgängig </Typography>
          <DeleteIcon />
          <Typography>= Training löschen</Typography>
        </Stack>
      </Grid>
    </Grid>
  );
}
