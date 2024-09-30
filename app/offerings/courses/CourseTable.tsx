import {
  CourseDto,
  dayOfWeekToHumanReadable,
  DisciplineDto,
  UserDto,
} from '@/lib/dto';
import {
  DataGrid,
  GridColDef,
  GridEventListener,
  useGridApiRef,
} from '@mui/x-data-grid';
import { DayOfWeek } from '@prisma/client';
import Box from '@mui/system/Box';
import React from 'react';

function buildColumns(
  disciplines: { id: number; name: string; costCenterId: number }[],
): GridColDef[] {
  return [
    { field: 'name', headerName: 'Kurs' },
    {
      field: 'weekdays',
      headerName: 'Wochentag',
      valueGetter: (weekdays: DayOfWeek[]) => {
        return weekdays.map((wd) => dayOfWeekToHumanReadable(wd, true));
      },
    },
    {
      field: 'time',
      headerName: 'Uhrzeit',
      valueGetter: (_, course: CourseDto) =>
        `${course.startHour.toString().padStart(2, '0')}:${course.startMinute.toString().padStart(2, '0')}`,
    },
    {
      field: 'disciplineId',
      headerName: 'Kostenstelle',
      valueGetter: (disciplineId: number) =>
        disciplines.find((d) => d.id === disciplineId)?.name ??
        disciplineId.toString(),
    },
    {
      field: 'trainers',
      headerName: 'Übungsleitungen',
      valueGetter: (trainers: UserDto[]) => trainers.map((t) => t.name),
      width: 300,
    },
  ];
}

export default function CourseTable(props: {
  courses: CourseDto[];
  activeCourse: CourseDto | null;
  setActiveCourse: (v: CourseDto) => void;
  costCenters: DisciplineDto[];
}) {
  const handleRowClick: GridEventListener<'rowClick'> = (params) => {
    props.setActiveCourse(params.row);
  };

  return (
    <Box component="div" overflow="auto" sx={{ height: 'calc(100vh - 320px)' }}>
      <DataGrid
        rows={props.courses}
        getRowId={(row) => row.id}
        columns={buildColumns(props.costCenters)}
        onRowClick={handleRowClick}
        initialState={{
          sorting: {
            sortModel: [{ field: 'name', sort: 'asc' }],
          },
        }}
        autosizeOnMount={true}
        autosizeOptions={{}}
      />
    </Box>
  );
}
