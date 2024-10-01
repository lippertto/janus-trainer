import React from 'react';

import List from '@mui/material/List';
import { HolidayDto, TrainingDto } from '@/lib/dto';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import {
  centsToHumanReadable,
  dateToHumanReadable,
  trainingStatusToHumanReadable,
} from '@/lib/formatters';
import { warningsForDate } from '@/lib/warnings-for-date';
import { TrainingStatus } from '@prisma/client';
import ListItemButton from '@mui/material/ListItemButton';
import Box from '@mui/system/Box';
import dayjs from 'dayjs';

function statusString(
  training: Pick<TrainingDto, 'status' | 'compensatedAt' | 'approvedAt'>,
): string {
  let result = trainingStatusToHumanReadable(training.status);

  if (training.compensatedAt) {
    result += ' am ' + dayjs(training.compensatedAt).format('DD.MM.YYYY');
  } else if (training.approvedAt) {
    result += ' am ' + dayjs(training.approvedAt).format('DD.MM.YYYY');
  }
  return result + '. ';
}

function secondaryString(training: TrainingDto): string {
  if (training.course?.isCustomCourse) {
    return `${centsToHumanReadable(training.compensationCents)}. `;
  } else {
    return `${training.participantCount} Personen. ${centsToHumanReadable(training.compensationCents)}. `;
  }
}

function TrainingListElement(props: {
  training: TrainingDto;
  holidays: HolidayDto[];
  handleEdit: () => void;
}) {
  const { training } = props;

  const primary = `${dateToHumanReadable(training.date)} - ${training.course!.name}`;
  const secondary = secondaryString(training);
  const warnings = warningsForDate(
    training.date,
    props.holidays,
    training.course!.weekdays,
  );
  const text = (
    <ListItemText
      primary={primary}
      secondary={
        <>
          {secondary}
          {statusString(training)}
          {training.comment ? `"${training.comment}"` : null}
          {warnings.length > 0 ? (
            <div style={{ color: 'darkorange' }}> {warnings.join(', ')}</div>
          ) : null}
        </>
      }
      secondaryTypographyProps={{ component: 'span' }}
    />
  );

  if (training.status !== TrainingStatus.NEW) {
    // we need the left padding because the ListItemButton below adds a bit of padding
    return (
      <ListItem>
        <Box sx={{ pl: 2 }}>{text}</Box>
      </ListItem>
    );
  } else {
    return (
      <ListItem>
        <ListItemButton onClick={() => props.handleEdit()}>
          {text}
        </ListItemButton>
      </ListItem>
    );
  }
}

export function TrainingList(props: {
  trainings: TrainingDto[];
  holidays: HolidayDto[];
  handleEdit: (t: TrainingDto) => void;
}) {
  const { trainings } = props;
  return (
    <React.Fragment>
      <List style={{ maxHeight: '85vh', overflow: 'auto' }}>
        {trainings.map((t) => (
          <TrainingListElement
            key={t.id}
            training={t}
            holidays={props.holidays}
            handleEdit={() => props.handleEdit(t)}
          />
        ))}
      </List>
    </React.Fragment>
  );
}
