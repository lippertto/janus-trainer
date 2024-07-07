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
import { useSuspenseQuery } from '@tanstack/react-query';
import { API_TRAININGS_SUMMARIZE } from '@/lib/routes';
import { fetchListFromApi } from '@/lib/fetch';
import { TrainingSummaryDto } from '@/lib/dto';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Paper from '@mui/material/Paper';


function trainingSummaryQuery(
  accessToken: string,
  filterStart: dayjs.Dayjs,
  filterEnd: dayjs.Dayjs,
) {
  return useSuspenseQuery({
    queryKey: [API_TRAININGS_SUMMARIZE, filterStart, filterEnd],
    queryFn: () => fetchListFromApi<TrainingSummaryDto>(
      `${API_TRAININGS_SUMMARIZE}?startDate=${filterStart.format('YYYY-MM-DD')}&endDate=${filterEnd.format('YYYY-MM-DD')}`,
      accessToken!,
      'POST',
    ),
    staleTime: 10 * 60 * 1000,
  });
}

function TrainerListValues(
  props: { session: JanusSession, filterStart: dayjs.Dayjs, filterEnd: dayjs.Dayjs, onlyNew: boolean,
    selectedTrainerId: string|null,
    setSelectedTrainerId: (v: string) => void,
  },
) {
  const { data: trainers } = trainingSummaryQuery(props.session.accessToken, props.filterStart, props.filterEnd);

  return <List>
    {trainers
      .filter((t) => (props.onlyNew ? t.newTrainingCount > 0 : true))
      .map((t) => (
        <ListItemButton
          onClick={() => props.setSelectedTrainerId(t.trainerId)}
          selected={(props.selectedTrainerId === t.trainerId)}
          key={t.trainerId}
        >
          <ListItemText>{t.trainerName} ({t.newTrainingCount} neu/{t.approvedTrainingCount} freig.) </ListItemText>
        </ListItemButton>
      ))}

  </List>;

}

export default function TrainerList(
  props: { session: JanusSession, filterStart: dayjs.Dayjs, filterEnd: dayjs.Dayjs,
    selectedTrainerId: string|null, setSelectedTrainerId: (v: string) => void
  },
) {
  const [trainerFilter, setTrainerFilter] = React.useState<string>('new');

  return <React.Fragment>
    <Stack spacing={2}>

      <FormControl>
        <FormLabel>Übungsleitung</FormLabel>
        <RadioGroup
          row={true}
          value={trainerFilter}
          onChange={(e) => setTrainerFilter(e.target.value)}
        >
          <FormControlLabel value="all" control={<Radio />} label={'Alle ÜL'} />
          <FormControlLabel value="new" control={<Radio />} label={'Nur ÜL mit neuen'} />
        </RadioGroup>
      </FormControl>

      <Suspense fallback={<LoadingSpinner />}>
        <Paper>
          <TrainerListValues
            session={props.session}
            filterStart={props.filterStart}
            filterEnd={props.filterEnd}
            onlyNew={trainerFilter === 'new'}
            selectedTrainerId={props.selectedTrainerId}
            setSelectedTrainerId={props.setSelectedTrainerId}
          />
        </Paper>
      </Suspense>
    </Stack>
  </React.Fragment>;
}