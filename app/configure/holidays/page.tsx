'use client';
import React, { Suspense, useState } from 'react';

import { useSession } from 'next-auth/react';

import dayjs from 'dayjs';

import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { showError, showSuccess } from '@/lib/notifications';
import {
  HolidayCreateRequest,
  HolidayDto,
  HolidayUpdateRequest,
} from '@/lib/dto';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { HolidayDialog } from '@/app/configure/holidays/HolidayDialog';
import { useConfirm } from 'material-ui-confirm';
import Box from '@mui/system/Box';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DatePicker } from '@mui/x-date-pickers';
import { compareByField, replaceElementWithId } from '@/lib/sort-and-filter';
import { createInApi, deleteFromApi, updateInApi } from '@/lib/fetch';

function HolidayList(props: {
  accessToken: string;
  year: number;
  selectedHoliday: HolidayDto | null;
  setSelectedHoliday: (v: HolidayDto) => void;
}) {
  const { data: holidays } = holidaysSuspenseQuery(props.accessToken, [
    props.year,
  ]);

  return (
    <List style={{ maxHeight: 500, overflow: 'auto' }}>
      {holidays
        .sort((a, b) => compareByField(a, b, 'start'))
        .map((d) => (
          <ListItemButton
            key={d.id}
            onClick={() => {
              props.setSelectedHoliday(d);
            }}
            selected={props.selectedHoliday?.id === d.id}
          >
            <ListItemText
              primary={d.name}
              secondary={`${dateToHumanReadable(d.start)} - ${dateToHumanReadable(d.end)}`}
            />
          </ListItemButton>
        ))}
    </List>
  );
}

function HolidayPageContents({ session }: { session: JanusSession }) {
  const currentYear = new Date().getFullYear();
  const confirm = useConfirm();

  const [selectedHoliday, setSelectedHoliday] = useState<HolidayDto | null>(
    null,
  );
  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);

  const [holidayYear, setHolidayYear] = React.useState<number>(currentYear);
  const queryClient = useQueryClient();

  const createHolidayMutation = useMutation({
    mutationFn: (data: HolidayCreateRequest) => {
      return createInApi<HolidayDto>(API_HOLIDAYS, data, session.accessToken);
    },
    onSuccess: async (createdHoliday: HolidayDto) => {
      const year = parseInt(createdHoliday.start.substring(0, 4));
      if (year !== currentYear) {
        await queryClient.invalidateQueries({
          queryKey: [API_HOLIDAYS, year],
        });
      } else {
        queryClient.setQueryData(
          [API_HOLIDAYS, year],
          (holidays: HolidayDto[]) =>
            [...holidays, createdHoliday].sort((a, b) =>
              compareByField(a, b, 'start'),
            ),
        );
      }
    },
    onError: (e: Error) => {
      showError('Konnte den Feiertag nicht hinzufügen', e.message);
    },
  });

  const updateHolidayMutation = useMutation({
    mutationFn: (data: HolidayUpdateRequest) => {
      return updateInApi<HolidayDto>(
        `${API_HOLIDAYS}`,
        selectedHoliday!.id,
        data,
        session.accessToken,
      );
    },
    onSuccess: async (updatedHoliday: HolidayDto) => {
      setSelectedHoliday(null);
      const year = parseInt(updatedHoliday.start.substring(0, 4));
      if (year !== currentYear) {
        await queryClient.invalidateQueries({
          queryKey: [API_HOLIDAYS, year],
        });
      } else {
        queryClient.setQueryData(
          [API_HOLIDAYS, year],
          (holidays: HolidayDto[]) =>
            replaceElementWithId(holidays, updatedHoliday),
        );
      }
    },
    onError: (e) => {
      showError(`Fehler beim Löschen der Pauschalen-Gruppe`, e.message);
    },
  });

  const deleteHolidayMutation = useMutation({
    mutationFn: (holidayToDelete: HolidayDto) => {
      return deleteFromApi(API_HOLIDAYS, holidayToDelete!, session.accessToken);
    },
    onSuccess: async (deletedHoliday: HolidayDto) => {
      setSelectedHoliday(null);

      const year = parseInt(deletedHoliday.start.substring(0, 4));

      if (year !== currentYear) {
        await queryClient.invalidateQueries({
          queryKey: [API_HOLIDAYS, year],
        });
      } else {
        queryClient.setQueryData(
          [API_HOLIDAYS, year],
          (holidays: HolidayDto[]) =>
            holidays.filter((h) => h.id !== deletedHoliday.id),
        );
      }
      showSuccess(`Feiertag ${deletedHoliday?.name ?? ''} gelöscht`);
    },
    onError: (e: Error) => {
      showError(
        `Konnte den Feiertag ${selectedHoliday?.name ?? ''} nicht löschen`,
        e.message,
      );
    },
  });

  const handleDeleteClick = () => {
    if (!selectedHoliday) return;
    confirm({
      title: 'Feiertag löschen?',
      description: `Soll der Feiertag ${selectedHoliday.name} wirklich gelöscht werden?`,
    }).then(() => {
      deleteHolidayMutation.mutate(selectedHoliday!);
    });
  };

  return (
    <>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <Typography variant="h5">Feiertage</Typography>
          <Stack direction="row" spacing={4}>
            <ButtonGroup>
              <Button
                data-testid={'add-holiday-button'}
                onClick={() => {
                  setSelectedHoliday(null);
                  setDialogOpen(true);
                }}
              >
                Hinzufügen
              </Button>
              <Button
                disabled={!selectedHoliday}
                onClick={() => setDialogOpen(true)}
              >
                Bearbeiten
              </Button>
              <Button
                disabled={!selectedHoliday}
                onClick={() => handleDeleteClick()}
              >
                Löschen
              </Button>
            </ButtonGroup>
            <DatePicker
              views={['year']}
              label="Jahr"
              value={dayjs(`${holidayYear}-01-01`)}
              minDate={dayjs(`2023-01-01`)}
              maxDate={dayjs(`${currentYear + 1}-01-01`)}
              onChange={(value) => {
                if (!value) return;
                setHolidayYear(value.year());
              }}
              sx={{ mb: 3, width: 140 }}
            />
          </Stack>
          <Box>
            <Suspense fallback={<LoadingSpinner />}>
              <HolidayList
                accessToken={session.accessToken}
                year={holidayYear}
                selectedHoliday={selectedHoliday}
                setSelectedHoliday={setSelectedHoliday}
              />
            </Suspense>
          </Box>
        </Stack>
      </Paper>
      <HolidayDialog
        open={dialogOpen}
        handleClose={() => setDialogOpen(false)}
        handleSave={
          selectedHoliday
            ? updateHolidayMutation.mutate
            : createHolidayMutation.mutate
        }
        toEdit={selectedHoliday}
      />
    </>
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
