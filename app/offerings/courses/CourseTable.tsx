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
  GridRenderCellParams,
} from '@mui/x-data-grid';
import { DayOfWeek } from '@prisma/client';
import Box from '@mui/system/Box';
import React from 'react';
import LockIcon from '@mui/icons-material/Lock';

function buildColumns(
  disciplines: { id: number; name: string; costCenterId: number }[],
): GridColDef[] {
  return [
    { field: 'name', headerName: 'Kurs' },
    {
      field: 'isCustomCourse',
      headerName: '',
      renderCell: (params: GridRenderCellParams<any, boolean>) => {
        if (params.value) {
          return <LockIcon style={{ fontSize: 'small' }} />;
        } else {
          return <></>;
        }
      },
    },
    {
      field: 'weekday',
      headerName: 'Wochentag',
      valueGetter: (wd: DayOfWeek) => dayOfWeekToHumanReadable(wd, true),
    },
    {
      field: 'time',
      headerName: 'Uhrzeit',
      valueGetter: (_, course: CourseDto) => {
        if (course.isCustomCourse) {
          return '';
        } else {
          return `${course.startHour!.toString().padStart(2, '0')}:${course.startMinute!.toString().padStart(2, '0')}`;
        }
      },
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

  const columns = React.useMemo(
    () => buildColumns(props.costCenters),
    [props.costCenters],
  );

  return (
    <Box component="div" overflow="auto" sx={{ height: 'calc(100vh - 320px)' }}>
      <DataGrid
        rows={props.courses}
        getRowId={(row) => row.id}
        columns={columns}
        onRowClick={handleRowClick}
        initialState={{
          sorting: {
            sortModel: [{ field: 'name', sort: 'asc' }],
          },
        }}
        autosizeOnMount={true}
        autosizeOptions={{ includeOutliers: true }}
      />
    </Box>
  );
}
