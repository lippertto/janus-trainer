'use client';
import React from 'react';

import { useSession } from 'next-auth/react';

import Grid from '@mui/material/Unstable_Grid2';

import dayjs from 'dayjs';

import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { addHoliday, deleteHoliday } from '@/lib/api-holidays';
import { showError, showSuccess } from '@/lib/notifications';

import HolidayCard from './HolidayCard';
import CompensationCard from '@/app/configure/CompensationCard';
import { CompensationValueCreateRequest, CompensationValueDto, HolidayDto } from '@/lib/dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createInApi, deleteFromApi } from '@/lib/fetch';
import { API_COMPENSATION_VALUES } from '@/lib/routes';
import { compensationValuesSuspenseQuery } from '@/lib/shared-queries';

function ConfigurationPageContents({session}:{session:JanusSession}) {
  const queryClient = useQueryClient();
  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);
  const [holidayYear, setHolidayYear] = React.useState<number>(
    new Date().getFullYear(),
  );

  const {data: compensationValues} = compensationValuesSuspenseQuery(session.accessToken);

  const handleAddHoliday = React.useCallback(
    (start: dayjs.Dayjs, end: dayjs.Dayjs, name: string) => {
      addHoliday(session.accessToken, start, end, name)
        .then((h) => {
          if (h.start.substring(0, 4) === holidayYear.toString()) {
            setHolidays([...holidays, h]);
          }
        })
        .then(() => {
          showSuccess('Feiertag hinzugefügt');
        })
        .catch((e) => {
          showError('Konnte den Feiertag nicht hinzufügen', e.message);
        });
    },
    [ holidays, holidayYear, setHolidays],
  );

  const handleDeleteHoliday = React.useCallback(
    (holiday: HolidayDto) => {
      deleteHoliday(session.accessToken, holiday.id.toString())
        .then(() => {
          setHolidays(holidays.filter((h) => h.id !== holiday.id));
        })
        .then(() => {
          showSuccess(`Feiertag ${holiday?.name ?? ''} gelöscht`);
        })
        .catch((e) => {
          showError(`Konnte den Feiertag ${holiday?.name ?? ''} nicht löschen`, e.message);
        });
    },
    [ holidays, setHolidays],
  );

  const createCompensationValueMutation = useMutation({
    mutationFn: (data: CompensationValueCreateRequest) => {
      return createInApi<CompensationValueDto>(API_COMPENSATION_VALUES, data, session.accessToken);
    },
    onSuccess: (createdValue: CompensationValueDto) => {
      queryClient.setQueryData([API_COMPENSATION_VALUES], [...compensationValues, createdValue]);
      showSuccess(`Pauschale ${createdValue.description} wurde erstellt`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen der Pauschale`, e.message);
    },
  })

  const deleteCompensationValueMutation = useMutation({
    mutationFn: (compensationValue: CompensationValueDto) => {
      return deleteFromApi<CompensationValueDto>(API_COMPENSATION_VALUES, compensationValue, session.accessToken);
    },
    onSuccess: (deletedValue: CompensationValueDto) => {
      queryClient.setQueryData([API_COMPENSATION_VALUES], compensationValues.filter((cv) => (cv.id !== deletedValue.id)))
      showSuccess(`Pauschale ${deletedValue.description} wurde gelöscht`);
    },
    onError: (e) => {
      showError(`Fehler beim Löschen der Pauschale`, e.message);
    },
  })

  return (
    <>
      <Grid container spacing={2}>
        <Grid xs={6}>
          <HolidayCard
            holidays={holidays ?? []}
            handleAddHoliday={handleAddHoliday}
            handleDeleteHoliday={handleDeleteHoliday}
            holidayYear={holidayYear}
            setHolidayYear={setHolidayYear}
          />
        </Grid>
        <Grid>
          <CompensationCard values={compensationValues} handleAddCompensationValue={createCompensationValueMutation.mutate}
                            handleDeleteCompensationValue={deleteCompensationValueMutation.mutate}
          />
        </Grid>
      </Grid>
    </>
  );
}

export default function ConfigurationPage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <ConfigurationPageContents session={session}/>
}