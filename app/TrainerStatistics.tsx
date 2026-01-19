import React from 'react';
import dayjs from 'dayjs';
import { ConfigurationValueListResponse, TrainerReportDto } from '@/lib/dto';
import { currencyFormatter } from '@/lib/formatters';
import Box from '@mui/system/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import Tooltip from '@mui/material/Tooltip';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useSuspenseQuery } from '@tanstack/react-query';
import { ConfigKey } from '@/app/api/configuration/configuration';

interface TrainerStatisticsProps {
  trainerReportQueryFn: () => Promise<TrainerReportDto>;
  configurationQueryFn: () => Promise<ConfigurationValueListResponse>;
  userId: string;
  year: number;
}

export function TrainerStatistics({
  trainerReportQueryFn,
  configurationQueryFn,
  userId,
  year,
}: TrainerStatisticsProps) {
  // Fetch trainer report
  const { data } = useSuspenseQuery({
    queryKey: ['trainer-statistics', userId, year],
    queryFn: trainerReportQueryFn,
    staleTime: 10 * 60 * 1000,
  });

  // Fetch configuration values
  const { data: configurationData } = useSuspenseQuery({
    queryKey: ['configuration'],
    queryFn: configurationQueryFn,
    staleTime: 10 * 60 * 1000,
  });

  // Get configuration values
  const maxCompensationCentsPerYear =
    parseInt(
      configurationData.value.find(
        (c) => c.key === ConfigKey.MAX_COMPENSATION_CENTS_PER_YEAR,
      )?.value || '0',
    ) || 0;
  const maxTrainingsPerCourse =
    parseInt(
      configurationData.value.find(
        (c) => c.key === ConfigKey.MAX_TRAININGS_PER_COURSE,
      )?.value || '0',
    ) || 0;

  // Calculate total compensation across all courses
  const totalCompensationCents = data.courses
    .flatMap((course) => course.trainings)
    .map((training) => training.compensationCents)
    .reduce((sum, cents) => sum + cents, 0);

  const totalCompensation = currencyFormatter(totalCompensationCents / 100.0);
  const maxCompensation = currencyFormatter(
    maxCompensationCentsPerYear / 100.0,
  );

  return (
    <Paper>
      <Box padding={2}>
        <Typography variant="h6">Statistiken {year}</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography>
            Gesamtvergütung: {totalCompensation} / {maxCompensation}
          </Typography>
          <Tooltip title="Die Gesamtvergütung ist aus steuerlichen Gründen begrenzt">
            <InfoOutlinedIcon fontSize="small" color="action" />
          </Tooltip>
        </Box>

        {data.courses.length > 0 && (
          <>
            <Box
              display="flex"
              alignItems="center"
              gap={1}
              sx={{ marginTop: 2 }}
            >
              <Typography variant="subtitle1">Pro Kurs</Typography>
            </Box>
            <List dense>
              {data.courses.map((course) => {
                const trainingCount = course.trainings.length;
                return (
                  <ListItemText
                    key={course.courseId}
                    primary={course.courseName}
                    secondary={`${trainingCount} / ${maxTrainingsPerCourse} Einheiten`}
                  />
                );
              })}
            </List>
          </>
        )}
      </Box>
    </Paper>
  );
}
