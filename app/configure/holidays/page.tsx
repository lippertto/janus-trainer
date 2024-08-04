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
import CompensationCard from '@/app/configure/compensation-values/CompensationCard';
import { HolidayDto } from '@/lib/dto';
import { useQueryClient } from '@tanstack/react-query';
import { holidaysQuery, resultHasData } from '@/lib/shared-queries';
import { API_HOLIDAYS } from '@/lib/routes';
import DisciplineCard from '@/app/configure/cost-centers/DisciplineCard';
import Box from '@mui/material/Box';

function HolidayPageContents({ session }: { session: JanusSession }) {
  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);
  const [holidayYear, setHolidayYear] = React.useState<number>(
    new Date().getFullYear(),
  );
  const queryClient = useQueryClient();

  const holidaysResult = holidaysQuery(session?.accessToken, [holidayYear]);

  const handleAddHoliday = React.useCallback(
    (start: dayjs.Dayjs, end: dayjs.Dayjs, name: string) => {
      addHoliday(session.accessToken, start, end, name)
        .then((h) => {
          if (h.start.substring(0, 4) === holidayYear.toString()) {
            queryClient.invalidateQueries({queryKey: [API_HOLIDAYS, holidayYear]})
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
    [holidays, holidayYear, setHolidays],
  );

  const handleDeleteHoliday = React.useCallback(
    (holiday: HolidayDto) => {
      deleteHoliday(session.accessToken, holiday.id.toString())
        .then(() => {
          queryClient.invalidateQueries({queryKey: [API_HOLIDAYS, holidayYear]})
          setHolidays(holidays.filter((h) => h.id !== holiday.id));
        })
        .then(() => {
          showSuccess(`Feiertag ${holiday?.name ?? ''} gelöscht`);
        })
        .catch((e) => {
          showError(`Konnte den Feiertag ${holiday?.name ?? ''} nicht löschen`, e.message);
        });
    },
    [holidays, setHolidays],
  );

  React.useEffect(() => {
    if (resultHasData(holidaysResult)) {
      setHolidays(holidaysResult.data!);
    }
  }, [holidaysResult.data]);


  return (
    <Box width={'100%'}>
          <HolidayCard
            holidays={holidays ?? []}
            handleAddHoliday={handleAddHoliday}
            handleDeleteHoliday={handleDeleteHoliday}
            holidayYear={holidayYear}
            setHolidayYear={setHolidayYear}
          />
    </Box>
  );
}

export default function HolidayPage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <HolidayPageContents session={session} />;
}