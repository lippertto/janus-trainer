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
import { getDisciplines } from '@/lib/api-disciplines';
import { getHolidays } from '@/lib/api-holidays';
import { showError } from '@/lib/notifications';
import { getTrainingsForPeriod } from '@/lib/api-trainings';
import { CompensationValue, Discipline, Holiday } from '@prisma/client';
import { TrainingDtoNew } from '@/lib/dto';
import { getCompensationValues } from '@/lib/api-compensation-values';

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
  const [compensationValues, setCompensationValues] = React.useState<CompensationValue[]>([]);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const refreshTrainings = React.useCallback(async () => {
    if (startDate?.isValid() && endDate?.isValid() && session?.accessToken) {
      return getTrainingsForPeriod(
        session.accessToken,
        startDate,
        endDate,
      ).then((v) => {
        v.sort((r1: TrainingDtoNew, r2: TrainingDtoNew) => r1.id - r2.id);
        setTrainings(v);
        return v;
      });
    }
    return [];
  }, [startDate, endDate, setTrainings, session?.accessToken]);

  // refresh everything
  useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    getDisciplines(session.accessToken).then((v) => setDisciplines(v));
    refreshTrainings();
    getHolidays(session.accessToken, [
      new Date().getFullYear() - 1,
      new Date().getFullYear(),
    ])
      .then((v) => setHolidays(v))
      .catch((e) => showError('Konnte Feiertage nicht laden', e.message));

    getCompensationValues(session.accessToken)
      .then((v) => setCompensationValues(v))
      .catch((e: Error) => {
        showError('Konnte Vergütungen nicht laden.', e.message);
      });

  }, [refreshTrainings, setDisciplines, session?.accessToken]);

  useEffect( () => {
    refreshTrainings();
  }, [startDate, endDate, refreshTrainings]);

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
          compensationValues={compensationValues}
          setTrainings={setTrainings}
          refresh={refreshTrainings}
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
