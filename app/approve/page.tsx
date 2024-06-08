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
import { HolidayDto, TrainingDto } from '@/lib/dto';
import { useQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_HOLIDAYS, API_TRAININGS } from '@/lib/routes';
import { holidaysQuery, resultHasData } from '@/lib/shared-queries';
import { CircularProgress } from '@mui/material';

dayjs.extend(quarterOfYear);

export default function ApprovePage(): React.ReactElement {
  const [startDate, setStartDate] = React.useState<dayjs.Dayjs | null>(
    dayjs().startOf('quarter'),
  );
  const [endDate, setEndDate] = React.useState<dayjs.Dayjs | null>(
    dayjs().endOf('quarter'),
  );
  const [trainings, setTrainings] = React.useState<TrainingDto[]>([]);
  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const trainingsResult = useQuery({
    queryKey: ['trainings', startDate, endDate],
    queryFn: () => fetchListFromApi<TrainingDto>(
      `${API_TRAININGS}?start=${startDate!.format('YYYY-MM-DD')}&end=${endDate!.format('YYYY-MM-DD')}`,
      session.accessToken,
    ),
    throwOnError: true,
    enabled: (!!session?.accessToken && startDate?.isValid() && endDate?.isValid()),
    initialData: [],
  });

  const holidayResult = holidaysQuery(session?.accessToken,
    [new Date().getFullYear(), new Date().getFullYear() - 1],
  )

  useEffect(() => {
    if (!holidayResult.isError && !holidayResult.isLoading && !holidayResult.isRefetching) {
      setHolidays(holidayResult.data!);
    }
  }, [holidayResult]);

  useEffect(() => {
    if (!trainingsResult.isError && !trainingsResult.isLoading) {
      setTrainings(trainingsResult.data);
    }
  }, [trainingsResult]);

  // refresh when the dates have changed
  useEffect(() => {
    // noinspection JSIgnoredPromiseFromCall
    trainingsResult.refetch()
  }, [startDate, endDate]);


  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  if (!resultHasData(trainingsResult)) {
    return <Stack alignItems="center"><CircularProgress /> </Stack>
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
          setTrainings={setTrainings}
          holidays={holidays}
          courses={[]}
          refresh={() => {
            holidayResult.refetch()
            trainingsResult.refetch()
          }}
          approvalMode={true}
          session={session}
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
