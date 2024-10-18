'use client';
import { useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import React from 'react';
import DateButton from '@/components/DateButton';
import dayjs from 'dayjs';
import {
  downloadTrainerReport,
  queryTrainerReport,
} from '@/app/report/queries';
import Typography from '@mui/material/Typography';
import { currencyFormatter } from '@/lib/formatters';
import { ReportCourseList } from '@/app/report/ReportCourseList';
import Box from '@mui/system/Box';
import Stack from '@mui/system/Stack';
import Paper from '@mui/material/Paper';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import Button from '@mui/material/Button';

function ReportPageContents(props: { session: JanusSession }) {
  const [startDate, setStartDate] = React.useState(dayjs().startOf('year'));
  const [endDate, setEndDate] = React.useState(dayjs().endOf('year'));

  const { data: report } = queryTrainerReport(
    props.session.accessToken,
    props.session.userId,
    startDate,
    endDate,
  );

  const trainingCount = report.courses
    .map((t) => t.trainings.length)
    .reduce((partial, value) => partial + value, 0);
  const totalCompensation = report.courses
    .flatMap((t) => t.trainings)
    .flatMap((oneDate) => oneDate.compensationCents)
    .reduce((partial, value) => partial + value, 0);
  const value = currencyFormatter(totalCompensation / 100.0);

  let maxValue = '';
  if (
    startDate.isSame(dayjs().startOf('year')) &&
    endDate.isSame(dayjs().endOf('year'))
  ) {
    maxValue = ' / ' + currencyFormatter(3000);
  }

  const moreThan3000 = totalCompensation >= 3000 * 100;

  const onDownload = async () => {
    const pdfData = await downloadTrainerReport(
      props.session.accessToken,
      props.session.userId,
      startDate,
      endDate,
    );
    const objectUrl = window.URL.createObjectURL(pdfData);
    const link = document.createElement('a');
    link.download = `Janus-Statistik-${dayjs().format('YYYY-MM-DD')}.pdf`;
    link.href = objectUrl;
    link.click();
    window.URL.revokeObjectURL(objectUrl);
  };

  return (
    <Box padding={2}>
      <Stack spacing={2}>
        <Typography variant="h4">Statistiken</Typography>

        <Stack direction="row" justifyContent="space-between">
          <DateButton
            startDate={startDate}
            setStartDate={setStartDate}
            endDate={endDate}
            setEndDate={setEndDate}
            options={[
              {
                label: 'Aktuelles Jahr',
                start: dayjs().startOf('year'),
                end: dayjs().endOf('year'),
              },
              {
                label: 'Letztes Jahr',
                start: dayjs().subtract(1, 'year').startOf('year'),
                end: dayjs().subtract(1, 'year').endOf('year'),
              },
            ]}
          />
          <Button onClick={onDownload} endIcon={<PictureAsPdfIcon />}>
            Export
          </Button>
        </Stack>

        <Paper>
          <Box padding={2}>
            <Typography variant="h6">Gesamt</Typography>

            <Typography>Gesamtanzahl Trainings: {trainingCount}</Typography>
            <Typography sx={{ color: moreThan3000 ? 'orange' : undefined }}>
              Gesamtvergütung: {value}
              {maxValue}
            </Typography>
          </Box>
        </Paper>

        <Paper>
          <Box padding={2}>
            <Typography variant="h6">Pro Kurs</Typography>

            <ReportCourseList courses={report.courses} />
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}

1;

export default function ReportPage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }
  if (!session) {
    return <LoadingSpinner />;
  }

  return <ReportPageContents session={session} />;
}
