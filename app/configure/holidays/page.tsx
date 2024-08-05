'use client';
import React, { Suspense, useState } from 'react';

import { useSession } from 'next-auth/react';

import dayjs from 'dayjs';

import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { addHoliday, deleteHoliday } from '@/lib/api-holidays';
import { showError, showSuccess } from '@/lib/notifications';
import { HolidayDto } from '@/lib/dto';
import { useQueryClient } from '@tanstack/react-query';
import { holidaysSuspenseQuery } from '@/lib/shared-queries';
import { API_HOLIDAYS } from '@/lib/routes';
import Stack from '@mui/system/Stack';
import Typography from '@mui/material/Typography';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { dateToHumanReadable } from '@/lib/formatters';
import { EnterHolidayDialog } from '@/app/configure/holidays/EnterHolidayDialog';
import { useConfirm } from 'material-ui-confirm';
import { ClickAwayListener } from '@mui/base/ClickAwayListener';
import Box from '@mui/system/Box';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DatePicker } from '@mui/x-date-pickers';

function HolidayList(props: {
  accessToken: string,
  setHolidays: (v: HolidayDto[]) => void,
  year: number,
  selectedHolidayId: number | null,
  setSelectedHolidayId: (v: number) => void
}) {
  const { data: holidays } = holidaysSuspenseQuery(props.accessToken, [props.year]);
  // we set the state only after the first render is complete.
  setTimeout(() => props.setHolidays(holidays), 300);

  return <List style={{ maxHeight: 500, overflow: 'auto' }}>
    {holidays.map(
      (d) =>
        (<ListItemButton
          key={d.id}
          onClick={() => {
            props.setSelectedHolidayId(d.id);
          }}
          selected={props.selectedHolidayId === d.id}
        >
          <ListItemText primary={d.name}
                        secondary={`${dateToHumanReadable(d.start)} - ${dateToHumanReadable(d.end)}`} />
        </ListItemButton>))}
  </List>;


}

function HolidayPageContents({ session }: { session: JanusSession }) {
  const currentYear =  new Date().getFullYear();
  const confirm = useConfirm();

  const [selectedHolidayId, setSelectedHolidayId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);

  const [holidays, setHolidays] = React.useState<HolidayDto[]>([]);
  const [holidayYear, setHolidayYear] = React.useState<number>(
   currentYear
  );
  const queryClient = useQueryClient();

  const handleDeleteClick = (selectedHolidayId: number | null) => {
    const holiday = holidays.find((h) => (h.id === selectedHolidayId));
    if (!holiday) return;
    confirm({
      title: 'Feiertag löschen?',
      description: `Soll der Feiertag ${holiday.name} wirklich gelöscht werden?`,
    }).then(() => {
      handleDeleteHoliday(holiday);
    });
  };

  const handleAddHoliday = React.useCallback(
    (start: dayjs.Dayjs, end: dayjs.Dayjs, name: string) => {
      addHoliday(session.accessToken, start, end, name)
        .then((h) => {
          if (h.start.substring(0, 4) === holidayYear.toString()) {
            queryClient.invalidateQueries({ queryKey: [API_HOLIDAYS, holidayYear] });
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
          queryClient.invalidateQueries({ queryKey: [API_HOLIDAYS, holidayYear] });
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

  return <>
    <Paper sx={{ p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="h5">Feiertage</Typography>
        <Stack direction="row" spacing={4}>
          <ButtonGroup>
            <Button
              data-testid={'add-holiday-button'}
              onClick={() => {
                setDialogOpen(true);
              }}>
              Hinzufügen
            </Button>
            <Button disabled={!selectedHolidayId} onClick={() => handleDeleteClick(selectedHolidayId)}>
              Löschen
            </Button>
          </ButtonGroup>
          <DatePicker
            views={['year']}
            label="Jahr"
            value={dayjs(`${holidayYear}-01-01`)}
            minDate={dayjs(`2023-01-01`)}
            maxDate={dayjs(`${currentYear}-01-01`)}
            onChange={(value) => {
              if (!value) return;
              setHolidayYear(value.year());
            }}
            sx={{ mb: 3, width: 140 }}
          />
        </Stack>
        <ClickAwayListener onClickAway={() => {
          setSelectedHolidayId(null);
        }}>
          <Box>
            <Suspense fallback={<LoadingSpinner />}>
              <HolidayList
                accessToken={session.accessToken}
                year={holidayYear}
                setHolidays={setHolidays}
                selectedHolidayId={selectedHolidayId}
                setSelectedHolidayId={setSelectedHolidayId}
              />
            </Suspense>
          </Box>
        </ClickAwayListener>
      </Stack>
    </Paper>
    <EnterHolidayDialog
      open={dialogOpen}
      handleClose={() => setDialogOpen(false)} handleSave={
      handleAddHoliday
    } />
  </>;
}

export default function HolidayPage() {

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <HolidayPageContents session={session} />;
}