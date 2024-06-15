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
import { HolidayDto, TrainingDto, UserDto } from '@/lib/dto';
import { useQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_TRAININGS } from '@/lib/routes';
import { compensationValuesSuspenseQuery, holidaysQuery, resultHasData, trainersQuery } from '@/lib/shared-queries';
import CircularProgress from '@mui/material/CircularProgress';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

dayjs.extend(quarterOfYear);

function TrainerDropdown({ trainers, selectedTrainerId, setSelectedTrainerId }: {
  trainers: UserDto[], selectedTrainerId: string | null, setSelectedTrainerId: (v: string | null) => void
}) {
  const selectedTrainerDto = trainers.find((t) => (t.id === selectedTrainerId));
  return <Autocomplete
    value={selectedTrainerDto ?? null}
    onChange={(_, value) => {
      setSelectedTrainerId(value?.id ?? null);
    }}
    options={trainers ?? []}
    getOptionLabel={(t) => (t.name)}
    renderInput={(params) => (
      <TextField
        {...params}
        label="Trainer"
      />
    )}
  />;
}

function trainingsQuery(
  accessToken: string | null,
  filterStart: dayjs.Dayjs | null,
  filterEnd: dayjs.Dayjs | null,
  trainerId?: string,
) {
  const startString = filterStart?.format('YYYY-MM-DD');
  const endString = filterEnd?.format('YYYY-MM-DD');
  const trainerFilter = trainerId ? `&trainerId=${trainerId}` : '';
  return useQuery({
    queryKey: ['trainings', startString, endString, trainerId],
    queryFn: () => fetchListFromApi<TrainingDto>(
      `${API_TRAININGS}?start=${startString}&end=${endString}${trainerFilter}`,
      accessToken!,
    ),
    throwOnError: true,
    enabled: (Boolean(accessToken) && filterStart?.isValid() && filterEnd?.isValid()),
    initialData: [],
    staleTime: 10 * 60 * 1000,
  });
}

const QUERY_PARAM_START = 'startDate';
const QUERY_PARAM_END = 'endDate';
const QUERY_PARAM_TRAINER_ID = 'trainerId';

interface ApprovePageContentsProps {
  session: JanusSession;
}

function ApprovePageContents({ session }: ApprovePageContentsProps): React.ReactElement {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();
  const queryParamStart = searchParams.get(QUERY_PARAM_START);
  const queryParamEnd = searchParams.get(QUERY_PARAM_END);
  const queryParamTrainerId = searchParams.get(QUERY_PARAM_TRAINER_ID);

  const [datePickerStart, setDatePickerStart] = React.useState<dayjs.Dayjs | null>(
    queryParamStart ? dayjs(queryParamStart) :
      dayjs().startOf('quarter'),
  );
  const [datePickerEnd, setDatePickerEnd] = React.useState<dayjs.Dayjs | null>(
    queryParamEnd ? dayjs(queryParamEnd) :
      dayjs().endOf('quarter'),
  );
  const [filterStart, setFilterStart] = React.useState<dayjs.Dayjs | null>(
    datePickerStart,
  );
  const [filterEnd, setFilterEnd] = React.useState<dayjs.Dayjs | null>(
    datePickerEnd,
  );
  const [selectedTrainerId, setSelectedTrainerId] = React.useState<string | null>(
    queryParamTrainerId,
  );

  const [trainings, setTrainings] = React.useState<TrainingDto[]>([]);
  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);

  const [trainers, setTrainers] = React.useState<UserDto[]>([]);

  const trainingsResult = trainingsQuery(session?.accessToken,
    filterStart, filterEnd, selectedTrainerId ?? undefined,
  );

  const holidayResult = holidaysQuery(session?.accessToken,
    [new Date().getFullYear(), new Date().getFullYear() - 1],
  );

  const trainersResult = trainersQuery(session?.accessToken);

  const { data: compensationValues } = compensationValuesSuspenseQuery(session.accessToken);

  useEffect(() => {
    if (resultHasData(holidayResult)) {
      setHolidays(holidayResult.data!);
    }
  }, [holidayResult.data]);

  useEffect(() => {
    if (resultHasData(trainingsResult)) {
      setTrainings(trainingsResult.data);
    }
  }, [trainingsResult.data]);

  useEffect(() => {
    if (resultHasData(trainersResult)) {
      setTrainers(trainersResult.data!);
    }
  }, [trainersResult.data]);

  // keeps track of the first render where we do not want ot refetch.
  const didMount = React.useRef(false);
  // refresh when the dates have changed
  useEffect(() => {
    if (didMount.current) {
      // noinspection JSIgnoredPromiseFromCall
      trainingsResult.refetch();
    } else {
      didMount.current = true;
    }
  }, [filterStart, filterEnd, selectedTrainerId]);

  // update the search params when the filters have changed.
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (datePickerStart) {
      params.set(QUERY_PARAM_START, datePickerStart.format('YYYY-MM-DD'));
      setFilterStart(datePickerStart);
    }
    if (datePickerEnd) {
      params.set(QUERY_PARAM_END, datePickerEnd.format('YYYY-MM-DD'));
      setFilterEnd(datePickerEnd);
    }
    if (selectedTrainerId) {
      params.set('trainerId', selectedTrainerId);
    } else {
      params.delete('trainerId');
    }
    replace(`${pathname}?${params.toString()}`);
  }, [datePickerStart, datePickerEnd, selectedTrainerId]);

  // update the filters when the url has changed
  useEffect(() => {
    const parsedStart = queryParamStart ? dayjs(queryParamStart) : null;
    if (parsedStart && parsedStart.format('YYYY-MM-DD') != datePickerStart?.format('YYYY-MM-DD')) {
      setDatePickerStart(parsedStart);
    }
    const parsedEnd = queryParamEnd ? dayjs(queryParamEnd) : null;
    if (parsedEnd && parsedEnd.format('YYYY-MM-DD') != datePickerEnd?.format('YYYY-MM-DD')) {
      setDatePickerEnd(parsedEnd);
    }

    const trainerId = searchParams.get('trainerId');
    setSelectedTrainerId(trainerId);
  }, [searchParams]);

  if (!resultHasData(trainingsResult) || !resultHasData(holidayResult)) {
    return <Stack alignItems="center"><CircularProgress /> </Stack>;
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
      <Grid xs={4}>
        <TrainerDropdown
          trainers={trainers ?? []}
          selectedTrainerId={selectedTrainerId}
          setSelectedTrainerId={setSelectedTrainerId}
        />
      </Grid>

      <Grid xs={12}>
        <TrainingTable
          trainings={trainings}
          setTrainings={setTrainings}
          holidays={holidays}
          courses={[]}
          approvalMode={true}
          session={session}
          compensationValues={compensationValues}
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

export default function ApprovePage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <ApprovePageContents session={session} />;
}