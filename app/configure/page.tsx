'use client';
import React from 'react';

import { useSession } from 'next-auth/react';

import Grid from '@mui/material/Unstable_Grid2';
import Button from '@mui/material/Button';
import { GridRowId } from '@mui/x-data-grid';

import dayjs from 'dayjs';

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
import { clearDatabase } from '@/lib/api-system';
import { Discipline, Holiday } from '@prisma/client';

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

function clearDatabaseButton(accessToken: string, refresh: () => void) {
  if (process.env.NEXT_PUBLIC_ENVIRONMENT === 'production') {
    return null;
  }
  return (
    <Grid xs={1}>
      <Button
        data-testid="configure-button-clear-database"
        color="error"
        onClick={() => {
          clearDatabase(accessToken).then(() => refresh());
        }}
      >
        Datenbank leeren
      </Button>
    </Grid>
  );
}

export default function Page() {
  const [disciplines, setDisciplines] = React.useState<Discipline[]>([]);
  const [holidays, setHolidays] = React.useState<Holiday[]>([]);
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
    (id: number | string) => {
      if (!session?.accessToken) return;
      deleteDiscipline(session.accessToken, id)
        .then(() =>
          setDisciplines(disciplines.filter((d) => d.id.toString() !== id)),
        )
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

  const loadDisciplines = React.useCallback((accessToken: string) => {
    getDisciplines(accessToken)
      .then((d) => d.toSorted(compareByNameProperty))
      .then((d) => {
        setDisciplines(d);
      })
      .catch((e: Error) => {
        showError('Konnte die Sportarten nicht laden.', e.message);
      });
  }, []);

  const loadHolidays = React.useCallback(
    (accessToken: string) => {
      if (!holidayYear) {
        setHolidays([]);
        return;
      }
      getHolidays(accessToken, [holidayYear])
        .then((h) => setHolidays(h))
        .catch((e: Error) => {
          showError('Konnte die Feiertage nicht laden.', e.message);
        });
    },
    [holidayYear],
  );

  React.useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    loadDisciplines(session.accessToken);
  }, [session?.accessToken, loadDisciplines]);

  React.useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    loadHolidays(session.accessToken);
  }, [session?.accessToken, loadHolidays]);

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
        {clearDatabaseButton(session.accessToken, () => {
          loadDisciplines(session.accessToken);
          loadHolidays(session.accessToken);
        })}
      </Grid>
    </>
  );
}
