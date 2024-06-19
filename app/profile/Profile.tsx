import React from 'react';

import Grid from '@mui/material/Unstable_Grid2';
import { Typography } from '@mui/material';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import EditIcon from '@mui/icons-material/Edit';
import { compensationGroupToHumanReadable, groupToHumanReadable, ibanToHumanReadable } from '@/lib/formatters';
import { CourseCard } from '@/components/CourseCard';
import Button from '@mui/material/Button';
import { signOut } from 'next-auth/react';
import { CourseDto, UserDto } from '@/lib/dto';

import 'core-js/modules/es.array.to-sorted';


export default function Profile(
  props: { user: UserDto, courses: CourseDto[], handleEditIbanClick: () => void },
) {
  const { user } = props;

  // Beate Kubny reported an empty groups array.
  const groupsDisplayString = user.groups ? user.groups.map(groupToHumanReadable).toSorted().join(', ') : 'Keine Gruppen';

  return <Grid container display={'flex'} spacing={2} sx={{ pl: 2, pr: 2 }}>
    <Grid xs={12}>
      <Typography variant={'h5'}>Stammdaten</Typography>
    </Grid>

    <Grid xs={4}>
      <TextField
        fullWidth
        disabled={true}
        label="Name"
        value={user.name}
      />
    </Grid>

    <Grid xs={4}>
      <TextField
        fullWidth
        disabled={true}
        label="Email"
        value={user.email}
      />
    </Grid>
    <Grid xs={4}>
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
    <Grid xs={6}>
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
    <Grid xs={6}>
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

    <Grid xs={12}>
      <Typography variant={'h5'}>Kurse</Typography>
    </Grid>
    {
      props.courses.length === 0 ? <Grid xs={12}><Typography>Keine Kurse hinterlegt.</Typography></Grid> :
        props.courses.map((c) => (<Grid key={c.id}><CourseCard course={c} /></Grid>))
    }
    <Grid xs={12}>
      <Button
        onClick={() => {
          signOut()
            .catch((e) => {
              console.log('Could not log out properly', JSON.stringify(e));
            });
        }}
      >Ausloggen</Button>
    </Grid>
  </Grid>;
}