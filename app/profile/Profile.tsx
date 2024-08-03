import React, { Suspense, useState } from 'react';

import Grid from '@mui/material/Unstable_Grid2';
import { CircularProgress, Typography } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import EditIcon from '@mui/icons-material/Edit';
import {
  centsToHumanReadable,
  compensationGroupToHumanReadable,
  groupToHumanReadable,
  ibanToHumanReadable,
} from '@/lib/formatters';
import { CourseCard } from '@/components/CourseCard';
import Button from '@mui/material/Button';
import { signOut } from 'next-auth/react';
import { CourseDto, UserDto } from '@/lib/dto';

import 'core-js/modules/es.array.to-sorted';
import { termsOfServiceSuspenseQuery, yearlyTotalsSuspenseQuery } from '@/lib/shared-queries';
import { TosDialog } from '@/components/TosDialog';
import Stack from '@mui/material/Stack';

function statisticsString(cents: number, trainingCoung: number) {
  return `Trainings: ${trainingCoung} / ${centsToHumanReadable(cents)}`;
}

function StatisticsData(props: { accessToken: string, year: number, trainerId: string },
) {
  const { year } = { ...props };
  const { data: totals } = yearlyTotalsSuspenseQuery(props.accessToken, year, props.trainerId);
  return <React.Fragment>
    <Grid xs={12} sm={3}>
      <TextField
        fullWidth
        label={`${year}/Q1`}
        value={statisticsString(totals[0].compensationCentsQ1, totals[0].trainingCountQ1)} />
    </Grid>
    <Grid xs={12} sm={3}>
      <TextField
      fullWidth
      label={`${year}/Q2`}
      value={statisticsString(totals[0].compensationCentsQ2, totals[0].trainingCountQ2)} />
    </Grid>
    <Grid xs={12} sm={3}>
      <TextField
      fullWidth
      label={`${year}/Q3`}
      value={statisticsString(totals[0].compensationCentsQ3, totals[0].trainingCountQ3)} />
    </Grid>
    <Grid xs={12} sm={3}>
      <TextField
      fullWidth
      label={`${year}/Q4`}
      value={statisticsString(totals[0].compensationCentsQ4, totals[0].trainingCountQ4)} />
    </Grid>
  </React.Fragment>;
}

function ProfileStatistics(props: { accessToken: string, year: number, trainerId: string }) {
  return <React.Fragment><Grid xs={12}>
    <Typography variant="h5">Statistik</Typography>
  </Grid>
    <Suspense fallback={<Grid xs={12}><CircularProgress /></Grid>
    }>
      <StatisticsData accessToken={props.accessToken} year={props.year} trainerId={props.trainerId} />
    </Suspense>
  </React.Fragment>;

}

export default function Profile(
  props: { accessToken: string, user: UserDto, courses: CourseDto[], handleEditIbanClick: () => void },
) {
  const { user } = props;
  const [showTosDialog, setShowTosDialog] = useState<boolean>(false);

  const { data: tosData } = termsOfServiceSuspenseQuery();

  // Beate Kubny reported an empty groups array.
  const groupsDisplayString = user.groups ? user.groups.map(groupToHumanReadable).toSorted().join(', ') : 'Keine Gruppen';

  return <><Grid container display={'flex'} spacing={2} sx={{ pl: 2, pr: 2 }}>
    <Grid xs={12}>
      <Typography variant={'h5'}>Stammdaten</Typography>
    </Grid>

    <Grid xs={12} sm={4}>
      <TextField
        fullWidth
        disabled={true}
        label="Name"
        value={user.name}
      />
    </Grid>

    <Grid xs={12} sm={4}>
      <TextField
        fullWidth
        disabled={true}
        label="Email"
        value={user.email}
      />
    </Grid>
    <Grid xs={12} sm={4}>
      <TextField
        fullWidth
        disabled={true}
        label="Gruppen"
        value={groupsDisplayString}
        inputProps={{
          'data-testid': 'profile-groups-textfield',
        }}
      />
    </Grid>
    <Grid xs={12} sm={6}>
      <TextField
        fullWidth
        disabled={true}
        label="IBAN"
        value={user.iban ? ibanToHumanReadable(user.iban) : 'keine IBAN angegeben'}
        InputProps={{
          endAdornment: <IconButton onClick={() => {
            props.handleEditIbanClick();
          }}><EditIcon /></IconButton>,
        }}
      />
    </Grid>
    <Grid xs={12} sm={6}>
      <TextField
        fullWidth={true}
        disabled={true}
        label="Pauschalen-Gruppen"
        value={
          user.compensationGroups.length > 0 ?
            user.compensationGroups.map(compensationGroupToHumanReadable).join(', ') :
            'keine'
        }
      />
    </Grid>

    <ProfileStatistics accessToken={props.accessToken} year={new Date().getFullYear()} trainerId={user.id} />

    <Grid xs={12}>
      <Typography variant={'h5'}>Kurse</Typography>
    </Grid>
    {
      props.courses.length === 0 ? <Grid xs={12}><Typography>Keine Kurse hinterlegt.</Typography></Grid> :
        props.courses.map((c) => (<Grid key={c.id}><CourseCard course={c} /></Grid>))
    }

    <Grid xs={12}>
      <Stack direction={'row'}>
        <Button onClick={() => setShowTosDialog(true)}>
          AGBs anzeigen
        </Button>
      <Button
        onClick={() => {
          signOut()
            .catch((e) => {
              console.log('Could not log out properly', JSON.stringify(e));
            });
        }}
      >Ausloggen</Button>
      </Stack>
    </Grid>
  </Grid>
  <TosDialog tosData={tosData} handleAccept={() => setShowTosDialog(false)} open={showTosDialog} />
  </>;
}