'use client';

import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import React, { Suspense, useState } from 'react';
import {
  getMaxTrainingsPerCourseQuery,
  trainingStatisticsSuspenseQuery,
} from '@/lib/shared-queries';
import Stack from '@mui/material/Stack';
import { DatePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import { TrainingDto, TrainingStatisticDto } from '@/lib/dto';
import Box from '@mui/material/Box';
import { DataGrid, GridRowId, GridRowSelectionModel } from '@mui/x-data-grid';
import { currencyFormatter } from '@/lib/formatters';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import DialogContentText from '@mui/material/DialogContentText';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

type SelectedCourse = {
  name: string;
  id: number;
};

function Table(props: {
  totals: TrainingStatisticDto[];
  setSelectedCourse: (v: SelectedCourse | null) => void;
  maxCoursesPerYear: number;
}) {
  const compensationCentsWidth = 100; // allows to show 1000,00 €
  const trainingCountWidth = 50;

  const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>({
    type: 'include',
    ids: new Set<GridRowId>([]),
  });

  return (
    <Box
      sx={{
        '.training-count-warning': {
          backgroundColor: '#ff943975',
        },
      }}
    >
      <DataGrid
        rows={props.totals}
        getRowId={(row) => row.courseId!}
        onRowSelectionModelChange={(newSelection) => {
          if (newSelection.ids.size === 0) {
            props.setSelectedCourse(null);
          } else {
            const selectedCourseId = newSelection.ids.values().next()
              .value as number;
            const selectedTotal = props.totals.find(
              (t) => t.courseId === selectedCourseId,
            );
            props.setSelectedCourse({
              name: selectedTotal?.courseName ?? '???',
              id: selectedCourseId,
            });
          }
          setSelectedRows(newSelection);
        }}
        columns={[
          {
            field: 'courseName',
            headerName: 'Kurs',
            width: 200,
            valueGetter: (_value, row) => row.courseName,
          },
          {
            field: 'trainingCountQ1',
            headerName: 'Q1 T',
            width: trainingCountWidth,
          },
          {
            field: 'trainingCountQ2',
            headerName: 'Q2 T',
            width: trainingCountWidth,
          },
          {
            field: 'trainingCountQ3',
            headerName: 'Q3 T',
            width: trainingCountWidth,
          },
          {
            field: 'trainingCountQ4',
            headerName: 'Q4 T',
            width: trainingCountWidth,
          },
          {
            field: 'trainingCountTotal',
            headerName: 'Σ T',
            width: trainingCountWidth,
            cellClassName: (params) => {
              if (params.row.trainingCountTotal < props.maxCoursesPerYear) {
                return '';
              } else {
                return 'yearly-total-warning';
              }
            },
          },
          {
            field: 'compensationCentsQ1',
            headerName: 'Q1 €',
            width: compensationCentsWidth,
            valueGetter: (value) => value / 100,
            valueFormatter: currencyFormatter,
          },
          {
            field: 'compensationCentsQ2',
            headerName: 'Q2 €',
            width: compensationCentsWidth,
            valueGetter: (value) => value / 100,
            valueFormatter: currencyFormatter,
          },
          {
            field: 'compensationCentsQ3',
            headerName: 'Q3 €',
            width: compensationCentsWidth,
            valueGetter: (value) => value / 100,
            valueFormatter: currencyFormatter,
          },
          {
            field: 'compensationCentsQ4',
            headerName: 'Q4 €',
            width: compensationCentsWidth,
            valueGetter: (value) => value / 100,
            valueFormatter: currencyFormatter,
          },
          {
            field: 'compensationCentsTotal',
            headerName: 'Σ €',
            type: 'number',
            width: compensationCentsWidth,
            valueGetter: (value) => value / 100,
            valueFormatter: currencyFormatter,
          },
        ]}
      />
    </Box>
  );
}

function DetailsContents(props: {
  fetchTrainingsForCourse: () => Promise<TrainingDto[]>;
  queryKey: string;
}) {
  const { data } = useSuspenseQuery({
    queryKey: [props.queryKey],
    queryFn: props.fetchTrainingsForCourse, // Use the passed function
  });
  return (
    <>
      {data
        .toSorted((a, b) => (a.date < b.date ? -1 : 1))
        .map((t) => (
          <DialogContentText key={t.id}>
            {t.date} - {t.user?.name}
          </DialogContentText>
        ))}
    </>
  );
}

function CourseDetailsDialog(props: {
  open: boolean;
  onClose: () => void;
  selectedCourse?: SelectedCourse | null;
  fetchTrainingsForCourse: () => Promise<TrainingDto[]>;
  queryKey: string;
}) {
  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>
        Details für {props.selectedCourse?.name ?? '???'}
      </DialogTitle>
      <DialogContent>
        <Suspense fallback={<LoadingSpinner />}>
          <DetailsContents
            fetchTrainingsForCourse={props.fetchTrainingsForCourse}
            queryKey={props.queryKey}
          />
        </Suspense>
      </DialogContent>
    </Dialog>
  );
}

function buildFetchFunctionForTrainings(
  accessToken: string,
  selectedCourse: SelectedCourse | null,
  year: number,
): () => Promise<TrainingDto[]> {
  if (!selectedCourse) {
    return () => new Promise(() => []);
  }
  const params = new URLSearchParams();
  params.set('expand', 'user');
  params.set('courseId', selectedCourse.id.toString());
  params.set('start', `${year}-01-01`);
  params.set('end', `${year}-12-31`);
  params.set('status', 'COMPENSATED');

  return () =>
    fetchListFromApi(`/api/trainings?${params.toString()}`, accessToken);
}

function Contents(props: { accessToken: string }) {
  let currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number>(currentYear);
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState(false);

  const { data: yearlySummaries } = trainingStatisticsSuspenseQuery(
    props.accessToken,
    year,
    'course',
  );

  const { data: maxCoursesPerYear } = getMaxTrainingsPerCourseQuery(
    props.accessToken,
  );

  return (
    <Box
      sx={{
        '.yearly-total-warning': {
          backgroundColor: '#ff943975',
        },
      }}
    >
      <CourseDetailsDialog
        open={showDetails}
        selectedCourse={selectedCourse}
        fetchTrainingsForCourse={buildFetchFunctionForTrainings(
          props.accessToken,
          selectedCourse,
          year,
        )}
        queryKey={`${selectedCourse?.id}/{year}`}
        onClose={() => setShowDetails(false)}
      />
      <Stack direction="column" spacing={2} sx={{ alignItems: 'flex-start' }}>
        <Accordion sx={{ width: '100%' }}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography>Wie werden diese Werte berechnet?</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2">
              Auf dieser Seite werden die gebuchten Trainings pro Kurs
              zusammengefasst.
            </Typography>
            <Typography variant="body2">
              Berücksichtigt werden nur Trainings, die ausbezahlt wurden.
            </Typography>
            <Typography variant="body2">
              Die Spalten mit "T" zeigen die Anzahl der Trainings in den
              Quartalen "Q1"-"Q4" und im ganzen Jahr ("Σ"). Dabei werden alle
              Trainings, die an einem Tag stattgefunden haben, zusammengefasst,
              um abzubilden, dass manche Kurse von zwei ÜL gleichzeitig gegeben
              werden.
            </Typography>
            <Typography variant="body2">
              Die Spalten mit "€" beinhalten die tatsächlich ausgezahlten
              Beträge, ebenfalls nach Quartalen und dem Jahr gruppiert.
            </Typography>
            <Typography variant="body2">
              Um Details zu einer bestimmten Zeile zu sehen, wähle eine Zeile
              aus und klicke auf "Details".
            </Typography>
          </AccordionDetails>
        </Accordion>
        <Stack direction="row" spacing={2}>
          <DatePicker
            views={['year']}
            label="Jahr"
            value={dayjs(`${year}-01-01`)}
            minDate={dayjs(`2023-01-01`)}
            maxDate={dayjs(`${currentYear}-01-01`)}
            onChange={(value) => {
              if (!value) return;
              setYear(value.year());
            }}
            sx={{ mb: 3, width: 140 }}
          />
          <Button
            disabled={selectedCourse === null}
            onClick={() => setShowDetails(true)}
          >
            Details
          </Button>
        </Stack>
        <Table
          totals={yearlySummaries}
          setSelectedCourse={setSelectedCourse}
          maxCoursesPerYear={maxCoursesPerYear}
        />
      </Stack>
    </Box>
  );
}

export default function CountPerCoursePage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <Contents accessToken={session.accessToken} />;
}
