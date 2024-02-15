'use client';
import React from 'react';

import { useSession } from 'next-auth/react';

import Grid from '@mui/material/Unstable_Grid2';
import { GridRowId } from '@mui/x-data-grid';

import dayjs from 'dayjs';

import { DisciplineDto, HolidayDto } from 'janus-trainer-dto';

import { JanusSession } from '@/lib/auth';
import {
  addDiscipline,
  deleteDiscipline,
  getDisciplines,
} from '@/lib/api-disciplines';
import LoginRequired from '@/components/LoginRequired';
import { getHolidays, addHoliday, deleteHoliday } from '@/lib/api-holidays';
import { showError, showSuccess } from '@/lib/notifications';

import DisciplineList from './DisciplineCard';
import HolidayCard from './HolidayCard';

function compareByNameProperty(
  a: { name: string },
  b: { name: string },
): number {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

export default function Page() {
  const [disciplines, setDisciplines] = React.useState<DisciplineDto[]>([]);
  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);
  const [holidayYear, setHolidayYear] = React.useState<number>(
    new Date().getFullYear(),
  );

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const handleAddDiscipline = React.useCallback(
    (name: string) => {
      if (!session?.accessToken) return;
      addDiscipline(session.accessToken, name).catch((e: Error) => {
        showError('Konnte Sportart nicht hinzufügen', e.message);
      });
    },
    [session?.accessToken],
  );

  const handleDeleteDiscipline = React.useCallback(
    (id: string) => {
      if (!session?.accessToken) return;
      deleteDiscipline(session.accessToken, id)
        .then(() => setDisciplines(disciplines.filter((d) => d.id !== id)))
        .catch((e) => {
          showError('Konnte Sportart nicht löschen', e.message);
        });
    },
    [session?.accessToken, disciplines, setDisciplines],
  );

  const handleAddHoliday = React.useCallback(
    (start: dayjs.Dayjs, end: dayjs.Dayjs, name: string) => {
      if (!session?.accessToken) {
        showError(
          'Es gab ein Problem mit der Anmeldung. Bitte Seite neu laden.',
        );
      }
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
    (id: GridRowId) => {
      if (!session?.accessToken) return;
      const holidayToDelete = holidays.find((h) => h.id === id);
      deleteHoliday(session.accessToken, id as string)
        .then(() => {
          setHolidays(holidays.filter((h) => h.id !== id));
        })
        .then(() => {
          showSuccess(`Feiertag ${holidayToDelete?.name ?? ''} gelöscht`);
        })
        .catch((e) => {
          showError('Konnte den Feiertag nicht löschen', e.message);
        });
    },
    [session?.accessToken, holidays, setHolidays],
  );

  React.useEffect(() => {
    if (!session?.accessToken) {
      return;
    }

    getDisciplines(session.accessToken)
      .then((d) => d.toSorted(compareByNameProperty))
      .then((d) => {
        setDisciplines(d);
      })
      .catch((e: Error) => {
        showError('Konnte die Sportarten nicht laden.', e.message);
      });
  }, [session?.accessToken]);

  React.useEffect(() => {
    if (!session?.accessToken || !holidayYear) {
      return;
    }
    getHolidays(session.accessToken, holidayYear)
      .then((h) => setHolidays(h))
      .catch((e: Error) => {
        showError('Konnte die Feiertage nicht laden.', e.message);
      });
  }, [session?.accessToken, holidayYear]);

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <>
      <Grid container spacing={2}>
        <Grid>
          <DisciplineList
            disciplines={disciplines}
            handleAddDiscipline={handleAddDiscipline}
            deleteDiscipline={handleDeleteDiscipline}
          />
        </Grid>
        <Grid xs={6}>
          <HolidayCard
            holidays={holidays}
            handleAddHoliday={handleAddHoliday}
            handleDeleteHoliday={handleDeleteHoliday}
            holidayYear={holidayYear}
            setHolidayYear={setHolidayYear}
          />
        </Grid>
      </Grid>
    </>
  );
}
