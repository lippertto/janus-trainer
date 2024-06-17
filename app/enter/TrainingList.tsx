import React from 'react';

import List from '@mui/material/List';
import { HolidayDto, TrainingDto } from '@/lib/dto';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import { centsToHumanReadable, dateToHumanReadable, trainingStatusToHumanReadable } from '@/lib/formatters';
import IconButton from '@mui/material/IconButton';
import EditIcon from '@mui/icons-material/Edit';
import { warningsForDate } from '@/lib/warnings-for-date';

function TrainingListElement(props: {
  training: TrainingDto,
  holidays: HolidayDto[],
  handleEdit: (t: TrainingDto) => void
}) {
  const { training } = props;

  const primary = `${dateToHumanReadable(training.date)} - ${training.course.name}`;
  const secondary = `${centsToHumanReadable(training.compensationCents)}, ${training.participantCount} Teilnehmer, ${trainingStatusToHumanReadable(training.status)}`;
  const warnings = warningsForDate(training.date, props.holidays, training.course.weekdays)

  return <ListItem
    secondaryAction={<IconButton onClick={() => props.handleEdit(training)}><EditIcon /></IconButton>}
  >
    <ListItemText
      primary={primary}
      secondary={
        <>
          {secondary}
          { warnings.length > 0 ? <span style={{color: "darkorange"}}> {warnings.join(", ")}</span> : null }
        </>}
    />
  </ListItem>;
}

export function TrainingList(props: {
  trainings: TrainingDto[],
  holidays: HolidayDto[],
  handleEdit: (t: TrainingDto) => void,
}) {
  const { trainings } = props;
  return <React.Fragment>
    <List>
      {trainings.map((t) => <TrainingListElement
        key={t.id} training={t} holidays={props.holidays} handleEdit={props.handleEdit}/>)}
    </List>
  </React.Fragment>;
}