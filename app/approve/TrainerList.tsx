import React, { Suspense } from 'react';
import Stack from '@mui/material/Stack';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormLabel from '@mui/material/FormLabel';
import FormControl from '@mui/material/FormControl';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { JanusSession } from '@/lib/auth';
import dayjs from 'dayjs';
import { TrainingSummaryDto } from '@/lib/dto';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';

function TrainerListValues(props: {
  filterStart: dayjs.Dayjs;
  filterEnd: dayjs.Dayjs;
  onlyNew: boolean;
  selectedTrainerId: string | null;
  setSelectedTrainerId: (v: string) => void;
  getTrainingSummaries: () => TrainingSummaryDto[];
}) {
  const summaries = props.getTrainingSummaries();

  return (
    <List>
      {summaries
        .filter((t) => (props.onlyNew ? t.newTrainingCount > 0 : true))
        .map((t) => (
          <ListItemButton
            onClick={() => props.setSelectedTrainerId(t.trainerId)}
            selected={props.selectedTrainerId === t.trainerId}
            key={t.trainerId}
          >
            <ListItemText>
              {t.trainerName} ({t.newTrainingCount} neu/
              {t.approvedTrainingCount} freig.){' '}
            </ListItemText>
          </ListItemButton>
        ))}
    </List>
  );
}

export default function TrainerList(props: {
  filterStart: dayjs.Dayjs;
  filterEnd: dayjs.Dayjs;
  selectedTrainerId: string | null;
  setSelectedTrainerId: (v: string) => void;
  getTrainingSummaries: () => TrainingSummaryDto[];
}) {
  const [trainerFilter, setTrainerFilter] = React.useState<string>('new');

  return (
    <React.Fragment>
      <Stack spacing={2}>
        <FormControl>
          <FormLabel>Übungsleitung</FormLabel>
          <RadioGroup
            row={true}
            value={trainerFilter}
            onChange={(e) => setTrainerFilter(e.target.value)}
          >
            <FormControlLabel
              value="all"
              control={<Radio />}
              label={'Alle ÜL'}
            />
            <FormControlLabel
              value="new"
              control={<Radio />}
              label={'Nur ÜL mit neuen'}
            />
          </RadioGroup>
        </FormControl>

        <Suspense fallback={<LoadingSpinner />}>
          <Paper>
            <TrainerListValues
              filterStart={props.filterStart}
              filterEnd={props.filterEnd}
              onlyNew={trainerFilter === 'new'}
              selectedTrainerId={props.selectedTrainerId}
              setSelectedTrainerId={props.setSelectedTrainerId}
              getTrainingSummaries={props.getTrainingSummaries}
            />
          </Paper>
        </Suspense>
      </Stack>
    </React.Fragment>
  );
}
