'use client';
import Stack from '@mui/material/Stack';
import { CircularProgress, Paper, Typography } from '@mui/material';
import React from 'react';
import { useMutation, useSuspenseQuery } from '@tanstack/react-query';
import { createInApi, deleteFromApi, fetchListFromApi, updateInApi } from '@/lib/fetch';
import { API_COURSES } from '@/lib/routes';
import { useSession } from 'next-auth/react';
import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import { useConfirm } from 'material-ui-confirm';
import { showError, showSuccess } from '@/lib/notifications';
import { compareByStringField, compareNamed } from '@/lib/sort-and-filter';
import Grid from '@mui/material/Unstable_Grid2';
import { CourseCreateRequest, CourseDto, UserDto } from '@/lib/dto';
import { CourseDialog } from '@/app/offerings/CourseDialog';
import { disciplinesSuspenseQuery, resultHasData, trainersSuspenseQuery } from '@/lib/shared-queries';
import { CourseCard } from '@/components/CourseCard';

type CourseCardsProps = {
  courses: CourseDto[] | null;
  activeCourse: CourseDto | null;
  setActiveCourse: (ac: CourseDto) => void;
}

function CourseCards(props: CourseCardsProps) {
  if (props.courses === null) {
    return <Stack alignItems="center"><CircularProgress /> </Stack>;
  }

  return <Grid container spacing={2}>
    {
      props.courses.map((c) => (
        <Grid key={c.id}>
          <CourseCard
            highlight={props.activeCourse?.id === c.id}
            onCourseClicked={props.setActiveCourse}
            course={c} />
        </Grid>))
    }
  </Grid>;
}

function OfferingsPageContents({ session }: { session: JanusSession }) {

  const [courses, setCourses] = React.useState<CourseDto[]>([]);
  const [activeCourse, setActiveCourse] = React.useState<CourseDto | null>(null);
  const [createCourseOpen, setCourseDialogOpen] = React.useState(false);

  const courseResult = useSuspenseQuery({
    queryKey: [API_COURSES],
    queryFn: () => fetchListFromApi<CourseDto>(`${API_COURSES}`, session.accessToken),
    staleTime: 10 * 60 * 1000,
  });

  let { data: trainers } = trainersSuspenseQuery(session.accessToken);
  trainers.sort(compareNamed);

  let { data: disciplines } = disciplinesSuspenseQuery(session.accessToken);
  disciplines.sort(compareNamed);

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

  const createCourseMutation = useMutation({
    mutationFn: (props: CourseCreateRequest) => {
      return createInApi<CourseDto>(API_COURSES, props, session?.accessToken ?? '');
    },
    onSuccess: (data: CourseDto) => {
      setCourses([...courses, data].toSorted(compareNamed));
      showSuccess(`Kurs ${data.name} erstellt`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen des Kurses`, e.message);
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: (props: { data: any, activeCourse: CourseDto }) => {
      const updateRequest = { ...props.data };
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
      setCourses(newCourses.toSorted(compareNamed));
      showSuccess(`Kurs ${data.name} aktualisiert`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen vom Kurs`, e.message);
    },
  });

  React.useEffect(() => {
    if (courseResult.isLoading) {
      return;
    }
    if (courseResult.isError) {
      showError(`Konnte Termine für nicht laden.`);
      return;
    }
    setCourses(courseResult.data!.toSorted(compareNamed));
  }, [
    courseResult.data,
  ]);

  const confirm = useConfirm();
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

  return <React.Fragment>

    <Paper sx={{ padding: 3 }}>
      <Stack spacing={2}>
        <Typography variant={'h5'}>Kurse</Typography>
        <ButtonGroup>
          <Button color={'error'}
                  onClick={() => {
                    handleDeleteCourseClick();
                  }}
                  disabled={activeCourse === null}
          >löschen</Button>
          <Button
            disabled={activeCourse === null}
            onClick={(() => {
              setCourseDialogOpen(true);
            })}
          >bearbeiten</Button>
          <Button
            onClick={() => {
              setActiveCourse(null);
              setCourseDialogOpen(true);
            }}
          >
            hinzufügen
          </Button>
        </ButtonGroup>
        <CourseCards
          courses={courses !== undefined ? courses : null}
          activeCourse={activeCourse}
          setActiveCourse={setActiveCourse}
        />
      </Stack>
    </Paper>

    <CourseDialog
      open={createCourseOpen}
      handleClose={() => {
        setCourseDialogOpen(false);
        setActiveCourse(null);
      }}
      handleSave={(data: CourseCreateRequest) => {
        if (activeCourse) {
          updateCourseMutation.mutate({ data, activeCourse: activeCourse! });
        } else {
          createCourseMutation.mutate({ ...data });
        }
      }}
      trainers={trainers}
      disciplines={disciplines}
      courseToEdit={activeCourse}
    />
  </React.Fragment>;
}

export default function OfferingsPage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <OfferingsPageContents session={session} />;
}