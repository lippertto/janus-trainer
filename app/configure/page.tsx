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
  deleteDiscipline, getDisciplines,
} from '@/lib/api-disciplines';
import LoginRequired from '@/components/LoginRequired';
import { getHolidays, addHoliday, deleteHoliday } from '@/lib/api-holidays';
import { showError, showSuccess } from '@/lib/notifications';

import DisciplineCard from './DisciplineCard';
import HolidayCard from './HolidayCard';
import { clearDatabase } from '@/lib/api-system';
import { CompensationValue, Discipline, Holiday } from '@prisma/client';
import CompensationCard from '@/app/configure/CompensationCard';
import { addCompensationValue, deleteCompensationValue, getCompensationValues } from '@/lib/api-compensation-values';

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
  if (window.location.hostname === 'janus.lippert.dev') {
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
  const [compensationValues, setCompensationValues] = React.useState<CompensationValue[]>([]);
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
      addDiscipline(session.accessToken, name).then((d) => {
        const newDisciplines = [...disciplines, d].toSorted(compareByNameProperty);
        setDisciplines(newDisciplines);
        showSuccess(`Sportart ${d.name} wurde hinzugefügt`);
      }).catch((e: Error) => {
        showError('Konnte Sportart nicht hinzufügen', e.message);
      });
    },
    [session?.accessToken, disciplines, setDisciplines],
  );

  const handleDeleteDiscipline = React.useCallback(
    (id: number | string) => {
      if (!session?.accessToken) return;
      deleteDiscipline(session.accessToken, id)
        .then(() => {
            const toBeDeleted = disciplines.find((d) => d.id === id);
            setDisciplines(disciplines.filter((d) => d.id !== id));
            showSuccess(`Sportart ${toBeDeleted?.name ?? ''} wurde gelöscht`);
          },
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

  const handleDeleCompensationValue = React.useCallback(
      (id: number) => {
        if (!session?.accessToken) return;
        deleteCompensationValue(session.accessToken, id).then(
          () => {
            setCompensationValues(compensationValues.filter((cv) => (cv.id !== id)))
            showSuccess('Buchbarer Betrag wurde gelöscht');
          },
        ).catch((e) => {
          showError(`Konnte den buchbaren Beterag nicht löschen`);
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

  const loadCompensationValues = React.useCallback(
    (accessToken: string) => {
      getCompensationValues(accessToken)
        .then((v) => setCompensationValues(v))
        .catch((e) => {
          showError('Konnte die buchbaren Beträge nicht laden');
        });
    }
    , [],
  );

  React.useEffect(() => {
    if (!session?.accessToken) {
      return;
    }
    loadDisciplines(session.accessToken);
    loadCompensationValues(session.accessToken);
  }, [session?.accessToken, loadDisciplines]);

// TODO - does this need to be split?
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
          <DisciplineCard
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
        <Grid>
          <CompensationCard values={compensationValues} handleAddCompensationValue={handleAddCompensationValue}
                            handleDeleteCompensationValue={handleDeleCompensationValue}
          />
        </Grid>
      </Grid>
    </>
  );
}
