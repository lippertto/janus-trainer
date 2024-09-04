import { CourseDto, dayOfWeekToHumanReadable, DisciplineDto, UserDto } from '@/lib/dto';
import { DataGrid, GridColDef, GridEventListener } from '@mui/x-data-grid';
import { Course, DayOfWeek } from '@prisma/client';

function buildColumns(disciplines: { id: number; name: string; costCenterId: number; }[]): GridColDef[] {
  return [
    { field: 'name', headerName: 'Kurs', width: 200 },
    {
      field: 'weekdays', headerName: 'Wochentag', valueGetter: (weekdays: DayOfWeek[]) => {
        return weekdays.map((wd) => dayOfWeekToHumanReadable(wd, true));
      },
    },
    {
      field: 'time',
      headerName: 'Uhrzeit',
      valueGetter: (_, course: CourseDto) => `${course.startHour.toString().padStart(2, '0')}:${course.startMinute.toString().padStart(2, '0')}`,
    },
    {
      field: 'disciplineId',
      headerName: 'Kostenstelle',
      valueGetter: (disciplineId: number) => (
        disciplines.find((d) => (d.id === disciplineId))?.name ?? disciplineId.toString()
      ),
    },
    {
      field: 'trainers',
      headerName: 'Übungsleitungen',
      valueGetter: (trainers: UserDto[]) => (trainers.map(t => t.name)),
      width: 300,
    },
  ];

}

export default function CourseTable(
  props: {
    courses: CourseDto[],
    activeCourse: CourseDto | null,
    setActiveCourse: (v: CourseDto) => void,
    disciplines: DisciplineDto[],
  }) {

  const handleRowClick: GridEventListener<'rowClick'> = (params) => {
    props.setActiveCourse(params.row);
  };

  return <DataGrid
    rows={props.courses}
    getRowId={(row) => (row.id)}
    columns={buildColumns(props.disciplines)}
    onRowClick={handleRowClick}
    initialState={{
      sorting: {
        sortModel: [{ field: 'name', sort: 'asc' }],
      },
    }}
  />;
}