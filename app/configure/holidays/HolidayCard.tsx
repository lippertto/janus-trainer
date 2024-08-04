import React from 'react';

import DeleteIcon from '@mui/icons-material/Delete';

import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardHeader from '@mui/material/CardHeader';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';

import { DatePicker } from '@mui/x-date-pickers';
import { DataGrid, GridActionsCellItem, GridColDef } from '@mui/x-data-grid';

import dayjs from 'dayjs';
import { Holiday } from '@prisma/client';
import { useConfirm } from 'material-ui-confirm';
import { dateToHumanReadable } from '@/lib/formatters';
import { EnterHolidayDialog } from '@/app/configure/holidays/EnterHolidayDialog';

function HolidayTable({
  rows,
                        handleDeleteClick,
}: {
  rows: Holiday[];
  handleDeleteClick: (holiday: Holiday | null) => void;
}) {
  const columns: GridColDef[] = [
    {
      headerName: 'Start',
      type: 'date',
      field: 'start',
      valueFormatter: (value: string) => {
        return dateToHumanReadable(value);
      },
      flex: 1,
    },
    {
      headerName: 'Ende',
      type: 'date',
      field: 'end',
      valueFormatter: (value: string) => {
        return dateToHumanReadable(value);
      },
      flex: 1,
    },
    {
      headerName: 'Beschreibung',
      type: 'string',
      field: 'name',
      flex: 2,
    },
    {
      field: 'actions',
      headerName: '',
      type: 'actions',
      flex: 0.2,
      getActions: ({ id }) => {
        const holiday = rows.find((h) => h.id === id);
        return [
          <GridActionsCellItem
            icon={<DeleteIcon />}
            label="bearbeiten"
            onClick={() => {
              handleDeleteClick(holiday ?? null);
            }}
            data-testid={`delete-holiday-${holiday?.name}`}
            key={id}
          />,
        ];
      },
    },
  ];
  return (
    <DataGrid
      data-testid="holiday-table"
      rows={rows}
      columns={columns}
      initialState={{
        sorting: {
          sortModel: [{ field: 'start', sort: 'asc' }],
        },
      }}
      hideFooter={true}
    />
  );
}

type HolidayCardProps = {
  holidays: Holiday[];
  handleAddHoliday: (
    start: dayjs.Dayjs,
    end: dayjs.Dayjs,
    name: string,
  ) => void;
  handleDeleteHoliday: (holiday: Holiday) => void;
  holidayYear: number;
  setHolidayYear: React.Dispatch<React.SetStateAction<number>>;
};

export default function HolidayCard({
  holidays,
  handleAddHoliday,
  handleDeleteHoliday,
  holidayYear,
  setHolidayYear,
}: HolidayCardProps) {
  const [showEnterDialog, setShowEnterDialog] = React.useState<boolean>(false);

  return (
    <>
      <Card>
        <CardHeader title={'Feiertage'} />
        <CardContent>
          <DatePicker
            views={['year']}
            label="Anzeige für Jahr"
            value={dayjs(`${holidayYear}-01-01`)}
            onChange={(value) => {
              if (!value) return;
              setHolidayYear(value.year());
            }}
            sx={{ mb: 3 }}
          />


        </CardContent>
        <CardActions>
          <Button
            onClick={() => {
              setShowEnterDialog(true);
            }}
            data-testid="add-holiday-button"
          >
            Feiertag hinzufügen
          </Button>
        </CardActions>
      </Card>
      <EnterHolidayDialog
        open={showEnterDialog}
        handleClose={() => setShowEnterDialog(false)}
        handleSave={handleAddHoliday}
      />
    </>
  );
}
