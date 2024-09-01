'use client';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import React, { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import LoginRequired from '../../components/LoginRequired';
import { JanusSession } from '@/lib/auth';
import PaymentSelection, { CURRENT_PAYMENT_ID } from '@/app/compensate/PaymentSelection';
import CompensationCard from '@/app/compensate/CompensationCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UserDto } from '@/lib/dto';
import { paymentsSuspenseQuery, trainersSuspenseQuery } from '@/lib/shared-queries';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Stack from '@mui/system/Stack';


function TrainerDropdown(props: {
  trainers: UserDto[],
  trainer: UserDto | null,
  setTrainer: (v: UserDto | null) => void,
}) {
  return <Autocomplete
    options={props.trainers}
    getOptionLabel={(t) => (t.name)}
    value={props.trainer}
    onChange={(_, value) => {
      props.setTrainer(value);
    }}
    renderInput={(params) => <TextField {...params} label="Übungsleitung" />}
  />;
}

function CompensationPageContents(props: {
  session: JanusSession,
}) {
  const [trainer, setTrainer] = React.useState<UserDto | null>(null);

  const { data: trainers } = trainersSuspenseQuery(props.session.accessToken);
  const { data: payments } = paymentsSuspenseQuery(props.session.accessToken, trainer?.id);

  const [selectedPaymentId, setSelectedPaymentId] = React.useState<number>(CURRENT_PAYMENT_ID);

  return (
    <Grid container spacing={2}>
      <Grid xs={3}>
        <Stack spacing={2}>
          <TrainerDropdown
            trainers={trainers}
            trainer={trainer}
            setTrainer={setTrainer}
          />
          <PaymentSelection session={props.session}
                            payments={payments}
                            selectedPaymentId={selectedPaymentId}
                            setSelectedPaymentId={setSelectedPaymentId}
          />
        </Stack>
      </Grid>
      <Grid xs={9}>
        <Suspense fallback={<LoadingSpinner />}>
          <CompensationCard session={props.session}
                            selectedPaymentId={selectedPaymentId}
                            trainer={trainer}
          />
        </Suspense>
      </Grid>
    </Grid>
  );
}

export default function CompensationPage() {

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <CompensationPageContents session={session} />;
}