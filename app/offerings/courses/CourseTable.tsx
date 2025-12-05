import {
  CourseDto,
  dayOfWeekToHumanReadable,
  CostCenterDto,
  UserDto,
} from '@/lib/dto';
import {
  DataGrid,
  GridColDef,
  GridEventListener,
  GridRenderCellParams,
} from '@mui/x-data-grid';
import { DayOfWeek } from '@/generated/prisma/enums';
import Box from '@mui/system/Box';
import React from 'react';
import LockIcon from '@mui/icons-material/Lock';

function buildColumns(
  costCenters: { id: number; name: string; costCenterId: number }[],
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
      field: 'costCenterId',
      headerName: 'Kostenstelle',
      valueGetter: (costCenterId: number) => {
        const existingCostCenter = costCenters.find(
          (d) => d.id === costCenterId,
        );
        if (existingCostCenter) {
          return existingCostCenter.name;
        } else {
          return costCenterId?.toString() ?? '[leer]';
        }
      },
    },
    {
      field: 'trainers',
      headerName: 'Übungsleitungen',
      valueGetter: (trainers: UserDto[]) => trainers.map((t) => t.name),
      width: 300,
    },
    {
      field: 'deletedAt',
      headerName: 'gelöscht',
      type: 'boolean',
      width: 130,
      valueGetter: (field: string) => Boolean(field),
    },
  ];
}

export default function CourseTable(props: {
  courses: CourseDto[];
  activeCourse: CourseDto | null;
  setActiveCourse: (v: CourseDto) => void;
  costCenters: CostCenterDto[];
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
          filter: {
            filterModel: {
              // items: []
              items: [{ field: 'deletedAt', operator: 'is', value: false }],
            },
          },
        }}
        autosizeOnMount={true}
        autosizeOptions={{ includeOutliers: true }}
      />
    </Box>
  );
}
