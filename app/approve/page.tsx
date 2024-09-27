'use client';
import React, { Suspense, useEffect } from 'react';
import TrainingTable from '@/app/approve/TrainingTable';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import dayjs from 'dayjs';
import Grid from '@mui/material/Grid2';
import { DatePicker } from '@mui/x-date-pickers';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import { holidaysSuspenseQuery } from '@/lib/shared-queries';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import TrainerList from '@/app/approve/TrainerList';
import { Typography } from '@mui/material';
import { LoadingSpinner } from '@/components/LoadingSpinner';

dayjs.extend(quarterOfYear);

const QUERY_PARAM_START = 'startDate';
const QUERY_PARAM_END = 'endDate';
const QUERY_PARAM_TRAINER_ID = 'trainerId';

type ApprovePageContentsProps = {
  session: JanusSession;
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  trainerId: string | null;
};

function ApprovePageContents(
  props: ApprovePageContentsProps,
): React.ReactElement {
  const { session } = props;
  const pathname = usePathname();
  const { replace } = useRouter();

  const [datePickerStart, setDatePickerStart] = React.useState<dayjs.Dayjs>(
    props.startDate,
  );
  const [datePickerEnd, setDatePickerEnd] = React.useState<dayjs.Dayjs>(
    props.endDate,
  );

  const [selectedTrainerId, setSelectedTrainerId] = React.useState<
    string | null
  >(props.trainerId);

  const { data: holidays } = holidaysSuspenseQuery(session.accessToken, [
    new Date().getFullYear(),
    new Date().getFullYear() - 1,
  ]);

  // update the search params when the filters have changed.
  useEffect(() => {
    const params = new URLSearchParams();
    if (datePickerStart) {
      params.set(QUERY_PARAM_START, datePickerStart.format('YYYY-MM-DD'));
    }
    if (datePickerEnd) {
      params.set(QUERY_PARAM_END, datePickerEnd.format('YYYY-MM-DD'));
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
      <Grid size={{ xs: 3 }}></Grid>
      <Grid size={{ xs: 3 }} style={{ display: 'flex', alignItems: 'center' }}>
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
              setDatePickerStart(
                dayjs().subtract(1, 'quarter').startOf('quarter'),
              );
              setDatePickerEnd(dayjs().subtract(1, 'quarter').endOf('quarter'));
            }}
          >
            letztes Quartal
          </Button>
        </ButtonGroup>
      </Grid>
      <Grid size={{ xs: 2 }}>
        <DatePicker
          label="Start"
          value={datePickerStart}
          onChange={(v) => {
            if (v && v.isValid()) {
              setDatePickerStart(v);
            }
          }}
        />
      </Grid>
      <Grid size={{ xs: 2 }}>
        <DatePicker
          label="Ende"
          value={datePickerEnd}
          onChange={(v) => {
            if (v && v.isValid()) {
              setDatePickerEnd(v);
            }
          }}
        />
      </Grid>
      <Grid size={{ xs: 2 }}></Grid>
      <Grid size={{ xs: 3 }}>
        <TrainerList
          session={session}
          filterEnd={datePickerEnd}
          filterStart={datePickerStart}
          selectedTrainerId={selectedTrainerId}
          setSelectedTrainerId={setSelectedTrainerId}
        />
      </Grid>
      <Grid size={{ xs: 9 }}>
        {selectedTrainerId ? (
          <Suspense fallback={<LoadingSpinner />}>
            <TrainingTable
              holidays={holidays}
              session={session}
              trainerId={selectedTrainerId}
              startDate={datePickerStart}
              endDate={datePickerEnd}
            />
          </Suspense>
        ) : (
          <Typography>Übungsleitung auswählen</Typography>
        )}
      </Grid>
    </Grid>
  );
}

export default function ApprovePage() {
  const searchParams = useSearchParams();
  const queryParamStart = searchParams.get(QUERY_PARAM_START)
    ? dayjs(searchParams.get(QUERY_PARAM_START))
    : dayjs().startOf('quarter');
  const queryParamEnd = searchParams.get(QUERY_PARAM_END)
    ? dayjs(searchParams.get(QUERY_PARAM_END))
    : dayjs().endOf('quarter');
  const queryParamTrainerId = searchParams.get(QUERY_PARAM_TRAINER_ID);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <ApprovePageContents
      session={session}
      startDate={queryParamStart}
      endDate={queryParamEnd}
      trainerId={queryParamTrainerId}
    />
  );
}
