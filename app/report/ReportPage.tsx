import React from 'react';
import dayjs from 'dayjs';
import { currencyFormatter } from '@/lib/formatters';
import Box from '@mui/system/Box';
import Stack from '@mui/system/Stack';
import Typography from '@mui/material/Typography';
import DateButton from '@/components/DateButton';
import Button from '@mui/material/Button';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import Paper from '@mui/material/Paper';
import { TrainerReportCourseDto } from '@/lib/dto';
import { showError } from '@/lib/notifications';
import List from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import { CircularProgress } from '@mui/material';

function ReportCourseList(props: {
  courses: TrainerReportCourseDto[];
  getMaxTrainingsPerCourse: () => number;
}) {
  const maxTrainings = props.getMaxTrainingsPerCourse();
  const moreThanAllowed = props.courses.length > maxTrainings;

  return (
    <List>
      {props.courses.map((c) => {
        const trainingCount = c.trainings.length;
        const compensation = c.trainings
          .flatMap((oneDate) => oneDate.compensationCents)
          .reduce((partial, value) => partial + value, 0);
        const compensationValueText = currencyFormatter(compensation / 100.0);

        return (
          <ListItemText
            primary={c.courseName}
            key={c.courseId}
            secondary={`${trainingCount} / ${maxTrainings} Einheiten, ${compensationValueText}`}
            slotProps={{
              secondary: { color: moreThanAllowed ? 'orange' : undefined },
            }}
          />
        );
      })}
    </List>
  );
}

export function ReportPage(props: {
  startDate: dayjs.Dayjs;
  setStartDate: (v: dayjs.Dayjs) => void;
  endDate: dayjs.Dayjs;
  setEndDate: (v: dayjs.Dayjs) => void;
  getReportCourses: () => TrainerReportCourseDto[];
  handleDownloadClick: () => Promise<void>;
  getMaxCentsPerYear: () => number;
  getMaxTrainingsPerCourse: () => number;
}) {
  const { startDate, endDate } = { ...props };

  const [downloading, setDownloading] = React.useState<boolean>(false);

  const courses = props.getReportCourses();

  const trainingCount = courses
    .map((t) => t.trainings.length)
    .reduce((partial, value) => partial + value, 0);
  const totalCompensation = courses
    .flatMap((t) => t.trainings)
    .flatMap((oneDate) => oneDate.compensationCents)
    .reduce((partial, value) => partial + value, 0);
  const value = currencyFormatter(totalCompensation / 100.0);

  const isOneYear =
    startDate.isSame(endDate.startOf('year')) &&
    endDate.isSame(startDate.endOf('year'));

  let maxValue = '';
  let moreThanAllowed = false;
  if (isOneYear) {
    const maxCents = props.getMaxCentsPerYear();
    maxValue = ' / ' + currencyFormatter(maxCents / 100.0);
    moreThanAllowed = totalCompensation >= maxCents;
  }

  return (
    <Box padding={2}>
      <Stack spacing={2}>
        <Typography variant="h4">Statistiken</Typography>
        <Stack direction="row" justifyContent="space-between">
          <DateButton
            startDate={startDate}
            setStartDate={props.setStartDate}
            endDate={endDate}
            setEndDate={props.setEndDate}
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
          {downloading ? (
            <CircularProgress />
          ) : (
            <Button
              onClick={() => {
                if (courses.length > 5) {
                  showError(
                    'Export von mehr als 5 Kursen nicht möglich. Bitte Tobias kontaktieren.',
                  );
                  return;
                }
                setDownloading(true);
                props
                  .handleDownloadClick()
                  .then(() => setDownloading(false))
                  .catch(() => {
                    showError('Pdf Download fehlgeschlagen');
                    setDownloading(false);
                  });
              }}
              endIcon={<PictureAsPdfIcon />}
              disabled={!isOneYear}
            >
              Export
            </Button>
          )}
        </Stack>
        <Paper>
          <Box padding={2}>
            <Typography variant="h6">Gesamt</Typography>

            <Typography>Gesamtanzahl Trainings: {trainingCount}</Typography>
            <Typography sx={{ color: moreThanAllowed ? 'orange' : undefined }}>
              Gesamtvergütung: {value}
              {maxValue}
            </Typography>
          </Box>
        </Paper>
        <Paper>
          <Box padding={2}>
            <Typography variant="h6">Pro Kurs</Typography>

            <ReportCourseList
              courses={courses}
              getMaxTrainingsPerCourse={props.getMaxTrainingsPerCourse}
            />
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}
