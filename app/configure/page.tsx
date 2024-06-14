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
import { addCompensationValue, deleteCompensationValue } from '@/lib/api-compensation-values';
import { CompensationValueDto, HolidayDto } from '@/lib/dto';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { API_COMPENSATION_VALUES } from '@/lib/routes';

function ConfigurationPageContents({session}:{session:JanusSession}) {
  const queryClient = useQueryClient();
  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);
  const [holidayYear, setHolidayYear] = React.useState<number>(
    new Date().getFullYear(),
  );

  const {data: compensationValues} = useSuspenseQuery({
    queryKey: [API_COMPENSATION_VALUES],
    queryFn: () => fetchListFromApi<CompensationValueDto>(
      `${API_COMPENSATION_VALUES}`,
      session.accessToken,
    ),
    staleTime: 60 * 1000,
  })

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

  const handleDeleteCompensationValue = React.useCallback(
      (id: number) => {
        deleteCompensationValue(session.accessToken, id).then(
          () => {
            queryClient.setQueryData([API_COMPENSATION_VALUES], compensationValues.filter((cv) => (cv.id !== id)));
            showSuccess('Pauschale wurde gelöscht');
          },
        ).catch((e) => {
          showError(`Konnte die Pauschale nicht löschen`, e.message);
        });
      }
      ,
      [compensationValues],
    )
  ;

  const handleAddCompensationValue = React.useCallback(
    (cents: number, description: string) => {
      addCompensationValue(session.accessToken, cents, description)
        .then((cv) => {
          let newValues = [...compensationValues, cv];
          console.log('newValue', newValues)
          queryClient.setQueryData([API_COMPENSATION_VALUES], newValues);
        })
        .then(() => {
          showSuccess('Pauschale hinzugefügt');
        })
        .catch((e) => {
          showError('Konnte die Pauschale nicht hinzufügen', e.message);
        });
    },
    [compensationValues],
  );

  console.log(JSON.stringify(compensationValues));

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
          <CompensationCard values={compensationValues} handleAddCompensationValue={handleAddCompensationValue}
                            handleDeleteCompensationValue={handleDeleteCompensationValue}
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