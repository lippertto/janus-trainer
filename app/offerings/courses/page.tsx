'use client';
import Stack from '@mui/material/Stack';
import { Paper, Typography } from '@mui/material';
import React from 'react';
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query';
import {
  createInApi,
  deleteFromApi,
  fetchListFromApi,
  updateInApi,
} from '@/lib/fetch';
import { API_COURSES } from '@/lib/routes';
import { useSession } from 'next-auth/react';
import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import { useConfirm } from 'material-ui-confirm';
import { showError, showSuccess } from '@/lib/notifications';
import { compareNamed, replaceElementWithId } from '@/lib/sort-and-filter';
import { CourseCreateRequest, CourseDto } from '@/lib/dto';
import { CourseDialog } from './CourseDialog';
import { trainersSuspenseQuery } from '@/lib/shared-queries';
import CourseTable from './CourseTable';
import { costCenterQuery } from './queries';

function OfferingsPageContents({ session }: { session: JanusSession }) {
  const queryClient = useQueryClient();
  const [activeCourse, setActiveCourse] = React.useState<CourseDto | null>(
    null,
  );
  const [createCourseOpen, setCourseDialogOpen] = React.useState(false);

  const { data: courses } = useSuspenseQuery({
    queryKey: [API_COURSES],
    queryFn: () =>
      fetchListFromApi<CourseDto>(
        `${API_COURSES}?${new URLSearchParams({ includeDeleted: 'true' })}`,
        session.accessToken,
      ),
    staleTime: 10 * 60 * 1000,
  });

  let { data: trainers } = trainersSuspenseQuery(session.accessToken);
  trainers.sort(compareNamed);

  let { data: costCenters } = costCenterQuery(session.accessToken);
  costCenters.sort(compareNamed);

  const deleteCourseMutation = useMutation({
    mutationFn: (course: CourseDto) =>
      deleteFromApi(API_COURSES, course, session.accessToken),
    onSuccess: (data) => {
      showSuccess(`Kurs ${data.name} gelöscht`);
      queryClient.setQueryData(
        [API_COURSES],
        courses.filter((d) => d.id !== data.id),
      );
    },
    onError: (e) => {
      showError(`Fehler beim Löschen von ${activeCourse?.name}`, e.message);
    },
  });

  const createCourseMutation = useMutation({
    mutationFn: (props: CourseCreateRequest) => {
      return createInApi<CourseDto>(
        API_COURSES,
        props,
        session?.accessToken ?? '',
      );
    },
    onSuccess: (data: CourseDto) => {
      queryClient.setQueryData([API_COURSES], [...courses, data]);
      showSuccess(`Kurs ${data.name} erstellt`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen des Kurses`, e.message);
    },
  });

  const updateCourseMutation = useMutation({
    mutationFn: (props: { data: any; activeCourse: CourseDto }) => {
      const updateRequest = { ...props.data };
      return updateInApi<CourseDto>(
        API_COURSES,
        props.activeCourse?.id ?? '',
        updateRequest,
        session?.accessToken ?? '',
      );
    },
    onSuccess: (data: CourseDto) => {
      queryClient.setQueryData(
        [API_COURSES],
        replaceElementWithId(courses, data),
      );

      showSuccess(`Kurs ${data.name} aktualisiert`);
    },
    onError: (e) => {
      showError(`Fehler beim Erstellen vom Kurs`, e.message);
    },
  });

  const confirm = useConfirm();
  const handleDeleteCourseClick = () => {
    confirm({
      title: 'Kurs löschen?',
      description: `Soll der Kurs "${activeCourse?.name}" gelöscht werden?`,
    }).then(() => {
      if (activeCourse) {
        deleteCourseMutation.mutate(activeCourse);
      }
    });
  };

  return (
    <React.Fragment>
      <Paper sx={{ padding: 3 }}>
        <Stack spacing={2}>
          <Typography variant={'h5'}>Kurse</Typography>
          <ButtonGroup>
            <Button
              color={'error'}
              onClick={() => {
                handleDeleteCourseClick();
              }}
              disabled={
                activeCourse === null ||
                activeCourse.isCustomCourse ||
                activeCourse.deletedAt !== null
              }
            >
              löschen
            </Button>
            <Button
              disabled={
                activeCourse === null ||
                activeCourse.isCustomCourse ||
                activeCourse.deletedAt !== null
              }
              onClick={() => {
                setCourseDialogOpen(true);
              }}
            >
              bearbeiten
            </Button>
            <Button
              onClick={() => {
                setActiveCourse(null);
                setCourseDialogOpen(true);
              }}
            >
              hinzufügen
            </Button>
          </ButtonGroup>
          <CourseTable
            courses={courses}
            activeCourse={activeCourse}
            setActiveCourse={setActiveCourse}
            costCenters={costCenters}
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
        costCenters={costCenters}
        toEdit={activeCourse}
      />
    </React.Fragment>
  );
}

export default function OfferingsPage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <OfferingsPageContents session={session} />;
}
