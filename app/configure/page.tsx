'use client';
import React from 'react';

import { useSession } from 'next-auth/react';

import Grid from '@mui/material/Unstable_Grid2';

import dayjs from 'dayjs';

import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { addHoliday, deleteHoliday, getHolidays } from '@/lib/api-holidays';
import { showError, showSuccess } from '@/lib/notifications';

import HolidayCard from './HolidayCard';
import CompensationCard from '@/app/configure/CompensationCard';
import { addCompensationValue, deleteCompensationValue, getCompensationValues } from '@/lib/api-compensation-values';
import { CompensationValueDto, HolidayDto } from '@/lib/dto';
import { holidaysQuery } from '@/lib/shared-queries';

export default function Page() {
  const [compensationValues, setCompensationValues] = React.useState<CompensationValueDto[]>([]);
  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);
  const [holidayYear, setHolidayYear] = React.useState<number>(
    new Date().getFullYear(),
  );

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const handleAddHoliday = React.useCallback(
    (start: dayjs.Dayjs, end: dayjs.Dayjs, name: string) => {
      if (!session?.accessToken) return;

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
    [session?.accessToken, holidays, holidayYear, setHolidays],
  );

  const handleDeleteHoliday = React.useCallback(
    (holiday: HolidayDto) => {
      if (!session?.accessToken) return;
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
    [session?.accessToken, holidays, setHolidays],
  );

  const handleDeleteCompensationValue = React.useCallback(
      (id: number) => {
        if (!session?.accessToken) return;
        deleteCompensationValue(session.accessToken, id).then(
          () => {
            setCompensationValues(compensationValues.filter((cv) => (cv.id !== id)));
            showSuccess('Buchbarer Betrag wurde gelöscht');
          },
        ).catch((e) => {
          showError(`Konnte den buchbaren Betrag nicht löschen`, e.message);
        });

      }
      ,
      [session?.accessToken, compensationValues, setCompensationValues],
    )
  ;

  const handleAddCompensationValue = React.useCallback(
    (cents: number, description: string) => {
      if (!session?.accessToken) {
        showError(
          'Es gab ein Problem mit der Anmeldung. Bitte Seite neu laden.',
        );
      }
      addCompensationValue(session.accessToken, cents, description)
        .then((cv) => {
          setCompensationValues([...compensationValues, cv]);
        })
        .then(() => {
          showSuccess('Buchbarer Betrag hinzugefügt');
        })
        .catch((e) => {
          showError('Konnte den buchbaren Betrag nicht hinzufügen', e.message);
        });
    },
    [session?.accessToken, holidays, holidayYear, setHolidays],
  );

  const holidaysResult = holidaysQuery(session?.accessToken, [holidayYear])

  const loadCompensationValues = React.useCallback(
    (accessToken: string) => {
      getCompensationValues(accessToken)
        .then((v) => setCompensationValues(v))
        .catch((e) => {
          showError('Konnte die buchbaren Beträge nicht laden', e.message);
        });
    }
    , [],
  );

  React.useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    loadCompensationValues(session.accessToken);
  }, [session?.accessToken]);

  React.useEffect(() => {
    if (!holidaysResult.isLoading && !holidaysResult.isError && !holidaysResult.isRefetching) {
      setHolidays(holidaysResult.data!)
    }
  }, [holidaysResult.data])

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

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
