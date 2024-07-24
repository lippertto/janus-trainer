'use client';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import React from 'react';
import { useSession } from 'next-auth/react';
import LoginRequired from '../../components/LoginRequired';
import { JanusSession } from '@/lib/auth';
import PaymentSelection, { CURRENT_PAYMENT_ID } from '@/app/compensate/PaymentSelection';
import CompensationCard from '@/app/compensate/CompensationCard';

function CompensationPageContents(props: {
  session: JanusSession,
}) {

  const [selectedPaymentId, setSelectedPaymentId] = React.useState<number>(CURRENT_PAYMENT_ID);

  return (
    <Grid container spacing={2}>
      <Grid xs={3}>
        <PaymentSelection session={props.session}
                          selectedPaymentId={selectedPaymentId}
                          setSelectedPaymentId={setSelectedPaymentId}
        />
      </Grid>
      <Grid xs={9}>
        <CompensationCard session={props.session}
                          selectedPaymentId={selectedPaymentId}
                          />
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

  return <CompensationPageContents session={session}/>
}