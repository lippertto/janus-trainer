'use client';
import Stack from '@mui/material/Stack';
import { CardActionArea, CircularProgress, Paper, Typography } from '@mui/material';
import List from '@mui/material/List';
import React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createInApi, deleteFromApi, fetchListFromApi, updateInApi } from '@/lib/fetch';
import { API_COURSES, API_DISCIPLINES, API_USERS } from '@/lib/routes';
import { useSession } from 'next-auth/react';
import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import { useConfirm } from 'material-ui-confirm';
import { showError, showSuccess } from '@/lib/notifications';
import { DisciplineDialogue } from '@/app/offerings/DisciplineDialog';
import { sortNamed } from '@/lib/sorting';
import Grid from '@mui/material/Unstable_Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import {
  CompensationValueDto,
  CourseCreateRequest,
  CourseDto,
  dayOfWeekToHumanReadable,
  DisciplineDto,
  User,
} from '@/lib/dto';
import { CourseDialog } from '@/app/offerings/CourseDialog';
import { compensationValuesQuery } from '@/lib/shared-queries';
import { Discipline } from '@prisma/client';

function CourseCard({ activeCourse, thisCourse, setActiveCourse }: {
  thisCourse: CourseDto,
  activeCourse: CourseDto | null,
  setActiveCourse(c: CourseDto | null): void
}) {
  return <React.Fragment>
    <Card
      sx={{ backgroundColor: activeCourse?.id === thisCourse.id ? `rgba(25, 118, 210, 0.08)` : '' }}
    >
      <CardActionArea
        onClick={() => setActiveCourse(thisCourse)}>
        <CardContent>
          <Typography variant={'h6'}>{thisCourse.name}</Typography>
          <Typography>{thisCourse.weekdays.map(dayOfWeekToHumanReadable).join(', ')}</Typography>
          <Typography>{thisCourse.startHour.toString().padStart(2, '0')}:{thisCourse.startMinute.toString().padStart(2, '0')}, {thisCourse.durationMinutes}min</Typography>
          <Typography>{thisCourse.trainers.map((t) => (t.name))}</Typography>
        </CardContent>
      </CardActionArea>
    </Card>
  </React.Fragment>;
}

type CourseCardsProps = {
  activeDiscipline: DisciplineDto | null;
  courses: CourseDto[] | null;
  activeCourse: CourseDto | null;
  setActiveCourse: (ac: CourseDto) => void;
}

function CourseCards(props: CourseCardsProps) {
  if (props.activeDiscipline === null) {
    return <Typography sx={{ typography: 'body2', textAlign: 'center' }}>Sportart auswählen</Typography>;
  }
  if (props.courses === null) {
    return <Stack alignItems="center"><CircularProgress /> </Stack>;
  }

  return <Grid container spacing={2}>
    {
      props.courses.map((c) => (
        <Grid key={c.id}>
          <CourseCard activeCourse={props.activeCourse} setActiveCourse={props.setActiveCourse} thisCourse={c} />
        </Grid>))
    }
  </Grid>;
}

export default function OfferingsPage() {

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const [disciplines, setDisciplines] = React.useState<DisciplineDto[]>([]);
  const [courses, setCourses] = React.useState<CourseDto[]>([]);
  const [trainers, setTrainers] = React.useState<User[]>([]);
  const [compensationValues, setCompensationValues] = React.useState<CompensationValueDto[]>([]);

  const [activeDiscipline, setActiveDiscipline] = React.useState<DisciplineDto | null>(null);
  const [activeCourse, setActiveCourse] = React.useState<CourseDto | null>(null);

  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [createCourseOpen, setCourseDialogOpen] = React.useState(false);

  const disciplineResult = useQuery({
    queryKey: ['disciplines'],
    queryFn: () => fetchListFromApi<DisciplineDto>(
      API_DISCIPLINES,
      session.accessToken,
    ),
    throwOnError: true,
    enabled: !!session?.accessToken,
    staleTime: 10 * 60 * 1000,
  });

  const courseResult = useQuery({
    queryKey: ['courses', activeDiscipline?.id],
    queryFn: () => fetchListFromApi<CourseDto>(`${API_COURSES}?disciplineId=${activeDiscipline?.id}`, session.accessToken),
    enabled: (Boolean(session?.accessToken) && Boolean(activeDiscipline?.id)),
    staleTime: 10 * 60 * 1000,
  });

  const trainerResult = useQuery({
    queryKey: ['users', 'trainers'],
    queryFn: () => fetchListFromApi<User>(`${API_USERS}?group=trainers`, session.accessToken),
    enabled: Boolean(session?.accessToken),
    throwOnError: true,
    staleTime: 10 * 60 * 1000,
  });

  const compensationValuesResult = compensationValuesQuery(session?.accessToken);

  const deleteDisciplineMutation = useMutation({
      mutationFn: (d: DisciplineDto) => deleteFromApi(API_DISCIPLINES, d, session.accessToken),
      onSuccess: (deleted) => {
        showSuccess(`Sportart ${deleted.name} gelöscht`);
        setDisciplines(disciplines.filter(d => (d.id !== deleted.id)));
      },
      onError: (e) => {
        showError(`Fehler beim Löschen von ${activeDiscipline?.name}`, e.message);
      },
    },
  );

  const deleteCourseMutation = useMutation({
    mutationFn: (course: CourseDto) => deleteFromApi(API_COURSES, course, session.accessToken),
    onSuccess: (data) => {
      showSuccess(`Kurs ${data.name} gelöscht`);
      setCourses(courses.filter(d => (d.id !== data.id)));
    },
    onError: (e) => {
      showError(`Fehler beim Löschen von ${activeCourse?.name}`, e.message);
    },
  });

  const createDisciplineMutation = useMutation({
      mutationFn: (data: { name: string }) => {
        return createInApi<DisciplineDto>(API_DISCIPLINES, data, session?.accessToken ?? '');
      },
      onSuccess: (data: DisciplineDto) => {
        setDisciplines([...disciplines, data].toSorted(sortNamed));
        showSuccess(`Sportart ${data.name} erstellt`);
      },
      onError: (e) => {
        showError(`Fehler beim Erstellen von ${activeDiscipline?.name}`, e.message);
      },
    },
  );

  const createCourseMutation = useMutation({
    mutationFn: (props: CourseCreateRequest) => {
      return createInApi<CourseDto>(API_COURSES, props, session?.accessToken ?? '');
    },
    onSuccess: (data: CourseDto) => {
      setCourses([...courses, data]);
      showSuccess(`Kurs ${data.name} erstellt`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen des Kurses`, e.message);
    },
  });

  const updateDisciplineMutation = useMutation({
    mutationFn: (data: { name: string }) => {
      return updateInApi<DisciplineDto>(API_DISCIPLINES, activeDiscipline?.id ?? '', data, session?.accessToken ?? '');
    },
    onSuccess: (data: DisciplineDto) => {
      const newDisciplines = disciplines.map((d) => {
        if (d.id === data.id) {
          return data;
        } else {
          return d;
        }
      });
      setDisciplines(newDisciplines.toSorted(sortNamed));
      showSuccess(`Sportart ${data.name} aktualisiert`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen von ${activeDiscipline?.name}`, e.message);
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: (props: { data: any, activeCourse: CourseDto, activeDiscipline: Discipline }) => {
      const updateRequest = { ...props.data, disciplineId: props.activeDiscipline.id };
      return updateInApi<CourseDto>(API_COURSES, props.activeCourse?.id ?? '', updateRequest, session?.accessToken ?? '');
    },
    onSuccess: (data: CourseDto) => {
      const newCourses = courses.map((d) => {
        if (d.id === data.id) {
          return data;
        } else {
          return d;
        }
      });
      setCourses(newCourses);
      showSuccess(`Kurs ${data.name} aktualisiert`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen vom Kurs`, e.message);
    },
  });


  React.useEffect(() => {
    if (disciplineResult.isLoading || disciplineResult.isError) {
      return;
    }
    if (disciplineResult.data) {
      setDisciplines(disciplineResult.data.toSorted(sortNamed));
    }
  }, [disciplineResult.data]);

  React.useEffect(() => {
    if (courseResult.isLoading) {
      return;
    }
    if (courseResult.isError) {
      showError(`Konnte Termine für ${activeDiscipline?.name} nicht laden. Bitte ab- und wieder anwählen.`);
      return;
    }
    setCourses(courseResult.data!);
  }, [
    courseResult.data,
  ]);

  React.useEffect(() => {
    if (trainerResult.isLoading || trainerResult.isError) {
      return;
    }
    if (trainerResult.data) {
      setTrainers(trainerResult.data.toSorted(sortNamed));
    }
  }, [trainerResult.data]);

  React.useEffect(() => {
    if (compensationValuesResult.data !== undefined && !compensationValuesResult.isLoading && !compensationValuesResult.isError) {
      setCompensationValues(compensationValuesResult.data);
    }
  }, [compensationValuesResult.data]);

  const confirm = useConfirm();
  const handleDeleteDisciplineClick = () => {
    confirm({
      title: 'Sportart löschen?',
      description: `Soll die Sportart "${activeDiscipline?.name}" gelöscht werden?`,
    })
      .then(
        () => {
          if (activeDiscipline) {
            deleteDisciplineMutation.mutate(activeDiscipline);
          }
        },
      );
  };
  const handleDeleteCourseClick = () => {
    confirm({
      title: 'Kurs löschen?',
      description: `Soll der Kurs "${activeCourse?.name}" gelöscht werden?`,
    })
      .then(
        () => {
          if (activeCourse) {
            deleteCourseMutation.mutate(activeCourse);
          }
        },
      );
  };

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }
  console.log(` ${activeCourse?.id}`);

  return <React.Fragment>
    <Stack direction="row" spacing={5}>
      <Paper sx={{ padding: 3 }}>
        <Stack spacing={2}>
          <Typography variant={'h5'}>Sportarten</Typography>
          <ButtonGroup>
            <Button
              color={'error'}
              disabled={activeDiscipline === null}
              onClick={handleDeleteDisciplineClick}
              data-testid={'discipline-delete-button'}
            >
              löschen
            </Button>
            <Button
              disabled={activeDiscipline === null}
              onClick={() => setCreateDialogOpen(true)}
            >
              bearbeiten
            </Button>
            <Button onClick={
              () => {
                setActiveDiscipline(null);
                setCreateDialogOpen(true);
              }
            }
                    data-testid={'add-discipline-button'}
            >
              hinzufügen
            </Button>
          </ButtonGroup>
          <List>
            {disciplines.map((d) => (
              <ListItemButton
                selected={d.id === activeDiscipline?.id}
                onClick={() => {
                  setActiveDiscipline(d);
                  setActiveCourse(null);
                }}
                key={d.id}
              >
                <ListItemText primary={d.name} />
              </ListItemButton>
            ))}
          </List>

        </Stack>
      </Paper>
      <Stack>
        <Paper sx={{ padding: 3 }}>
          <Stack spacing={2}>
            <Typography variant={'h5'}>Kurse</Typography>
            <ButtonGroup>
              <Button color={'error'}
                      onClick={() => {
                        handleDeleteCourseClick();
                      }}
                      disabled={activeDiscipline === null || activeCourse === null}
              >löschen</Button>
              <Button
                disabled={activeDiscipline === null || activeCourse === null}
                onClick={(() => {
                  setCourseDialogOpen(true);
                })}
              >bearbeiten</Button>
              <Button
                disabled={activeDiscipline === null}
                onClick={() => {
                  setActiveCourse(null);
                  setCourseDialogOpen(true);
                }}
              >
                hinzufügen
              </Button>
            </ButtonGroup>
            <CourseCards
              courses={courses !== undefined ? courses: null}
              activeDiscipline={activeDiscipline}
              activeCourse={activeCourse}
              setActiveCourse={setActiveCourse}
            />
          </Stack>
        </Paper>
      </Stack>
    </Stack>

    <DisciplineDialogue
      open={createDialogOpen}
      disciplines={disciplines}
      handleClose={() => {
        setCreateDialogOpen(false);
      }}
      handleSave={(data: { name: string }) => {
        if (activeDiscipline) {
          updateDisciplineMutation.mutate(data);
        } else {
          createDisciplineMutation.mutate(data);
        }
      }
      }
      disciplineToEdit={activeDiscipline}
    />
    <CourseDialog
      open={createCourseOpen}
      handleClose={() => {
        setCourseDialogOpen(false);
        setActiveCourse(null);
      }}
      handleSave={(data: Omit<CourseCreateRequest, 'disciplineId'>) => {
        if (activeCourse) {
          updateCourseMutation.mutate({ data, activeCourse: activeCourse!, activeDiscipline: activeDiscipline! });
        } else {
          createCourseMutation.mutate({ ...data, disciplineId: activeDiscipline!.id });
        }
      }}
      trainers={trainers}
      compensationValues={compensationValues}
      courseToEdit={activeCourse}
    />
  </React.Fragment>;
}