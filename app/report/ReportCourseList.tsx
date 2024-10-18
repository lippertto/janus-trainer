import React from 'react';
import { TrainerReportCourseDto } from '@/lib/dto';
import List from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import { currencyFormatter } from '@/lib/formatters';

export function ReportCourseList(props: { courses: TrainerReportCourseDto[] }) {
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
            secondary={`${trainingCount} Einheiten, ${compensationValueText}`}
          />
        );
      })}
    </List>
  );
}
