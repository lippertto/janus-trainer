'use client';
import React, { useEffect } from 'react';
import Stack from '@mui/system/Stack';
import TrainingTable from '@/components/TrainingTable';
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
import { HolidayDto, TrainingDto, TrainingSummaryDto } from '@/lib/dto';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_TRAININGS, API_TRAININGS_SUMMARIZE } from '@/lib/routes';
import { holidaysQuery, resultHasData } from '@/lib/shared-queries';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
import { Switch } from '@mui/material';
import {throttle} from 'throttle-debounce'

dayjs.extend(quarterOfYear);

function TrainerDropdown(props: {
  trainers: TrainingSummaryDto[], selectedTrainerId: string | null, setSelectedTrainerId: (v: string | null) => void,
  onlyWithNew: boolean,
}) {
  let trainers: TrainingSummaryDto[];
  if (props.onlyWithNew) {
    trainers = props.trainers.filter((t) => (t.newTrainingCount > 0))
  } else {
    trainers = props.trainers
  }
  const selectedTrainerDto = trainers.find((t) => (t.trainerId === props.selectedTrainerId));
  return <Autocomplete
    value={selectedTrainerDto ?? null}
    onChange={(_, value) => {
      props.setSelectedTrainerId(value?.trainerId ?? null);
    }}
    options={trainers ?? []}
    getOptionLabel={(t) => (`${t.trainerName} (${t.newTrainingCount}N/${t.approvedTrainingCount}F)`)}
    renderInput={(params) => (
      <TextField
        {...params}
        label="Übungsleitung"
      />
    )}
  />;
}

function queryKeyForTrainings(start: dayjs.Dayjs, end: dayjs.Dayjs, trainerId?: string) {
  return [API_TRAININGS, start.format('YYYY-MM-DD'), end.format('YYYY-MM-DD'), trainerId];
}

function trainingsQuery(
  accessToken: string,
  filterStart: dayjs.Dayjs,
  filterEnd: dayjs.Dayjs,
  trainerId?: string,
) {
  const startString = filterStart.format('YYYY-MM-DD');
  const endString = filterEnd.format('YYYY-MM-DD');
  const trainerFilter = trainerId ? `&trainerId=${trainerId}` : '';
  return useSuspenseQuery({
    queryKey: queryKeyForTrainings(filterStart, filterEnd, trainerId),
    queryFn: () => fetchListFromApi<TrainingDto>(
      `${API_TRAININGS}?start=${startString}&end=${endString}${trainerFilter}`,
      accessToken!,
    ),
    staleTime: 10 * 60 * 1000,
  });
}

function trainingSummaryQuery(
  accessToken: string,
  filterStart: dayjs.Dayjs,
  filterEnd: dayjs.Dayjs,
) {
  return useSuspenseQuery({
    queryKey: [API_TRAININGS_SUMMARIZE, filterStart, filterEnd],
    queryFn: () => fetchListFromApi<TrainingSummaryDto>(
      `${API_TRAININGS_SUMMARIZE}?startDate=${filterStart.format('YYYY-MM-DD')}&endDate=${filterEnd.format('YYYY-MM-DD')}`,
      accessToken!,
      'POST',
    ),
    staleTime: 10 * 60 * 1000,
  });
}

const QUERY_PARAM_START = 'startDate';
const QUERY_PARAM_END = 'endDate';
const QUERY_PARAM_TRAINER_ID = 'trainerId';

type ApprovePageContentsProps = {
  session: JanusSession;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  trainerId: string | null;
}

function compareTrainings(a: TrainingDto, b: TrainingDto) {
  if (a.date < b.date) return -1;
  if (a.date > b.date) return 1;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function ApprovePageContents(props: ApprovePageContentsProps): React.ReactElement {
  const { session } = props;
  const pathname = usePathname();
  const { replace } = useRouter();
  const queryClient = useQueryClient();

  const [datePickerStart, setDatePickerStart] = React.useState<dayjs.Dayjs>(
    props.startDate,
  );
  const [datePickerEnd, setDatePickerEnd] = React.useState<dayjs.Dayjs>(
    props.endDate,
  );
  const [filterStart, setFilterStart] = React.useState<dayjs.Dayjs>(
    datePickerStart,
  );
  const [filterEnd, setFilterEnd] = React.useState<dayjs.Dayjs>(
    datePickerEnd,
  );
  const [onlyWithNew, setOnlyWithNew] = React.useState(true);

  const { data: trainers } = trainingSummaryQuery(session.accessToken, filterStart, filterEnd);

  const [selectedTrainerId, setSelectedTrainerId] = React.useState<string | null>(
    props.trainerId ?? (trainers.length > 0 ? trainers[0].trainerId : null),
  );

  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);

  const { data: trainingData } = trainingsQuery(session.accessToken,
    filterStart, filterEnd, selectedTrainerId ?? undefined,
  );

  const [trainings, setTrainings] = React.useState<TrainingDto[]>([]);

  const holidayResult = holidaysQuery(session.accessToken,
    [new Date().getFullYear(), new Date().getFullYear() - 1],
  );

  const refresh = throttle(
    3000,
    () => {
      queryClient.invalidateQueries({
        queryKey: queryKeyForTrainings(
          props.startDate, props.endDate, props.trainerId ?? undefined,
        ),
      });
      queryClient.invalidateQueries({queryKey: [API_TRAININGS_SUMMARIZE, filterStart, filterEnd]})
    },
    {noLeading: true}
  )

  React.useEffect(() => {
    setTrainings(trainingData.toSorted(compareTrainings));
  }, [trainingData]);

  useEffect(() => {
    if (resultHasData(holidayResult)) {
      setHolidays(holidayResult.data!);
    }
  }, [holidayResult.data]);

  // update the search params when the filters have changed.
  useEffect(() => {
    const params = new URLSearchParams();
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

  return (
    <Grid container spacing={2}>
      <Grid xs={3}>
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
            if (v) {
              setDatePickerStart(v);
            }
          }}
        />
      </Grid>
      <Grid xs={2}>
        <DatePicker
          label="Ende"
          value={datePickerEnd}
          onChange={(v) => {
            if (v) {
              setDatePickerEnd(v);
            }
          }}
        />
      </Grid>
      <Grid xs={3}>
        <TrainerDropdown
          trainers={trainers ?? []}
          onlyWithNew={onlyWithNew}
          selectedTrainerId={selectedTrainerId}
          setSelectedTrainerId={setSelectedTrainerId}
        />
      </Grid>
      <Grid xs={2}>
        <FormGroup>
          <FormControlLabel control={
            <Switch
              checked={onlyWithNew}
              onChange={(e) => {
                setOnlyWithNew(e.target.checked)
              }} />
          } label="Nur ÜL mit neu" />
        </FormGroup>
      </Grid>

      <Grid xs={12}>
        <TrainingTable
          trainings={trainings}
          setTrainings={
            (trainings) => {
              setTrainings(trainings.toSorted(compareTrainings));
              refresh();
            }
          }
          holidays={holidays}
          courses={[]}
          approvalMode={true}
          session={session}
          compensationValues={[]}
        />
      </Grid>
      <Grid>
        <Stack direction="row" justifyContent="end" gap={1}>
          <FastForwardIcon />
          <Typography>= Freigeben </Typography>
          <FastRewindIcon />
          <Typography>= Freigabe rückgängig </Typography>
        </Stack>
      </Grid>
    </Grid>
  );
}

export default function ApprovePage() {
  const searchParams = useSearchParams();
  const queryParamStart = searchParams.get(QUERY_PARAM_START) ? dayjs(searchParams.get(QUERY_PARAM_START)) : dayjs().startOf('quarter');
  const queryParamEnd = searchParams.get(QUERY_PARAM_END) ? dayjs(searchParams.get(QUERY_PARAM_END)) : dayjs().endOf('quarter');
  const queryParamTrainerId = searchParams.get(QUERY_PARAM_TRAINER_ID);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <ApprovePageContents
    session={session}
    startDate={queryParamStart}
    endDate={queryParamEnd}
    trainerId={queryParamTrainerId}
  />;
}