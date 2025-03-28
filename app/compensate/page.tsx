'use client';
import Grid from '@mui/material/Grid';
import React, { Suspense } from 'react';
import { useSession } from 'next-auth/react';
import LoginRequired from '../../components/LoginRequired';
import { JanusSession } from '@/lib/auth';
import PaymentSelection, {
  CURRENT_PAYMENT_ID,
} from '@/app/compensate/PaymentSelection';
import CompensationBox from '@/app/compensate/CompensationBox';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UserDto } from '@/lib/dto';
import {
  paymentsSuspenseQuery,
  trainersSuspenseQuery,
} from '@/lib/shared-queries';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Stack from '@mui/system/Stack';
import { compareNamed } from '@/lib/sort-and-filter';

function TrainerDropdown(props: {
  trainers: UserDto[];
  trainer: UserDto | null;
  setTrainer: (v: UserDto | null) => void;
}) {
  return (
    <Autocomplete
      options={props.trainers}
      getOptionLabel={(t) => t.name}
      value={props.trainer}
      onChange={(_, value) => {
        props.setTrainer(value);
      }}
      renderInput={(params) => <TextField {...params} label="Übungsleitung" />}
    />
  );
}

function CompensationPageContents(props: { session: JanusSession }) {
  const [trainer, setTrainer] = React.useState<UserDto | null>(null);

  const trainers = trainersSuspenseQuery(
    props.session.accessToken,
  ).data.toSorted(compareNamed);
  const { data: payments } = paymentsSuspenseQuery(
    props.session.accessToken,
    trainer?.id,
  );

  const [selectedPaymentId, setSelectedPaymentId] =
    React.useState<number>(CURRENT_PAYMENT_ID);

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 3 }}>
        <Stack spacing={2}>
          <TrainerDropdown
            trainers={trainers}
            trainer={trainer}
            setTrainer={setTrainer}
          />
          <PaymentSelection
            session={props.session}
            payments={payments}
            selectedPaymentId={selectedPaymentId}
            setSelectedPaymentId={setSelectedPaymentId}
          />
        </Stack>
      </Grid>
      <Grid size={{ xs: 9 }}>
        <Suspense fallback={<LoadingSpinner />}>
          <CompensationBox
            session={props.session}
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
