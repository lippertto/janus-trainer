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
import { API_TRAININGS } from '@/lib/routes';
import { holidaysQuery, resultHasData } from '@/lib/shared-queries';
import { CircularProgress } from '@mui/material';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';

dayjs.extend(quarterOfYear);

export default function ApprovePage(): React.ReactElement {
  const searchParams= useSearchParams()
  const pathname = usePathname();
  const {replace} = useRouter();

  const [datePickerStart, setDatePickerStart] = React.useState<dayjs.Dayjs | null>(
    dayjs().startOf('quarter'),
  );
  const [datePickerEnd, setDatePickerEnd] = React.useState<dayjs.Dayjs | null>(
    dayjs().endOf('quarter'),
  );
  const [filterStart, setFilterStart] = React.useState<dayjs.Dayjs|null>(
    datePickerStart
  )
  const [filterEnd, setFilterEnd] = React.useState<dayjs.Dayjs|null>(
    datePickerEnd
  )
  const [trainings, setTrainings] = React.useState<TrainingDto[]>([]);
  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const trainingsResult = useQuery({
    queryKey: ['trainings', datePickerStart, datePickerEnd],
    queryFn: () => fetchListFromApi<TrainingDto>(
      `${API_TRAININGS}?start=${filterStart!.format('YYYY-MM-DD')}&end=${filterEnd!.format('YYYY-MM-DD')}`,
      session.accessToken,
    ),
    throwOnError: true,
    enabled: (!!session?.accessToken && filterStart?.isValid() && filterEnd?.isValid()),
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
  }, [filterStart, filterEnd]);

  // update the search params when startDate or endDate have changed.
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (datePickerStart) {
      params.set('startDate', datePickerStart.format('YYYY-MM-DD'))
      setFilterStart(datePickerStart);
    }
    if (datePickerEnd) {
      params.set('endDate', datePickerEnd.format('YYYY-MM-DD'))
      setFilterEnd(datePickerEnd)
    }
    replace(`${pathname}?${params.toString()}`);
  }, [datePickerStart, datePickerEnd])

  // update the date pickers when the url has changed
  useEffect(() => {
    const urlStart = searchParams.get('startDate')
    const parsedStart = urlStart ? dayjs(urlStart) : null;
    if (parsedStart && parsedStart.format('YYYY-MM-DD') != datePickerStart?.format('YYYY-MM-DD')) {
      setDatePickerStart(parsedStart)
    }
    const urlEnd = searchParams.get('endDate')
    const parsedEnd = urlStart ? dayjs(urlEnd) : null;
    if (parsedEnd && parsedEnd.format('YYYY-MM-DD') != datePickerEnd?.format('YYYY-MM-DD')) {
      setDatePickerEnd(parsedEnd)
    }
  }, [searchParams])

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  if (!resultHasData(trainingsResult) || !resultHasData(holidayResult)) {
    return <Stack alignItems="center"><CircularProgress /> </Stack>
  }

  return (
    <Grid container spacing={2}>
      <Grid display="flex" alignItems="center">
        <ButtonGroup>
          <Button
            onClick={() => {
              setDatePickerStart(dayjs().startOf('quarter'));
              setDatePickerEnd(dayjs().endOf('quarter'));
            }}
          >
            aktuelles Quartal
          </Button>
          <Button
            onClick={() => {
              setDatePickerStart(dayjs().subtract(1, 'quarter').startOf('quarter'));
              setDatePickerEnd(dayjs().subtract(1, 'quarter').endOf('quarter'));
            }}
          >
            letztes Quartal
          </Button>
        </ButtonGroup>
      </Grid>
      <Grid xs={2}>
        <DatePicker
          label="Start"
          value={datePickerStart}
          onChange={(v) => {
            setDatePickerStart(v);
          }}
        />
      </Grid>
      <Grid xs={2}>
        <DatePicker
          label="Ende"
          value={datePickerEnd}
          onChange={(v) => {
            setDatePickerEnd(v);
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
