import { CourseDto, dayOfWeekToHumanReadable } from '@/lib/dto';
import React from 'react';
import Card from '@mui/material/Card';
import { CardActionArea, Typography } from '@mui/material';
import CardContent from '@mui/material/CardContent';

function CourseContents({ course }: { course: CourseDto }) {
  return (
    <CardContent>
      <Typography variant={'h6'}>{course.name}</Typography>
      <Typography>
        {course.weekdays
          .map((wd) => dayOfWeekToHumanReadable(wd, false))
          .join(', ')}
      </Typography>
      <Typography>
        {course.startHour.toString().padStart(2, '0')}:
        {course.startMinute.toString().padStart(2, '0')},{' '}
        {course.durationMinutes}min
      </Typography>
      <Typography>{course.trainers.map((t) => t.name).join(', ')}</Typography>
    </CardContent>
  );
}

/**
 * Display information on a course.
 * @param highlight If the card should be highlighted
 * @param course The course to display
 * @param onCourseClicked What should happen if a course has been clicked.
 * @constructor
 */
export function CourseCard({
  highlight,
  course,
  onCourseClicked,
}: {
  course: CourseDto;
  highlight?: boolean;
  onCourseClicked?(c: CourseDto | null): void;
}) {
  return (
    <React.Fragment>
      <Card
        sx={{ backgroundColor: highlight ? `rgba(25, 118, 210, 0.08)` : '' }}
      >
        {onCourseClicked ? (
          <CardActionArea onClick={() => onCourseClicked(course)}>
            <CourseContents course={course} />
          </CardActionArea>
        ) : (
          <CourseContents course={course} />
        )}
      </Card>
    </React.Fragment>
  );
}
