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
import { PaymentDto, UserDto } from '@/lib/dto';
import { trainersSuspenseQuery } from '@/lib/shared-queries';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Stack from '@mui/system/Stack';
import { compareNamed } from '@/lib/sort-and-filter';
import { useSuspenseQuery } from '@tanstack/react-query';
import { API_PAYMENTS } from '@/lib/routes';
import { fetchListFromApi } from '@/lib/fetch';

async function paymentsQueryFn(
  accessToken: string,
  trainerId?: string,
  start?: string,
  end?: string,
): Promise<PaymentDto[]> {
  const params = new URLSearchParams();
  if (trainerId) {
    params.append('trainerId', trainerId);
  }
  if (start) {
    params.append('start', start);
  }
  if (end) {
    params.append('end', end);
  }

  return fetchListFromApi<PaymentDto>(`${API_PAYMENTS}?${params}`, accessToken);
}

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
  const [selectedYear, setSelectedYear] = React.useState<number>(
    new Date().getFullYear(),
  );

  const trainers = trainersSuspenseQuery(
    props.session.accessToken,
  ).data.toSorted(compareNamed);

  const start = `${selectedYear}-01-01`;
  const end = `${selectedYear}-12-31`;

  const { data: payments } = useSuspenseQuery({
    queryKey: [API_PAYMENTS, trainer?.id, start, end],
    queryFn: () =>
      paymentsQueryFn(props.session.accessToken, trainer?.id, start, end),
    staleTime: 60 * 60 * 1000, // 10 min
  });

  const [selectedPaymentId, setSelectedPaymentId] =
    React.useState<number>(CURRENT_PAYMENT_ID);

  // Generate year options (current year and past 5 years)
  const yearOptions = Array.from(
    { length: 6 },
    (_, i) => new Date().getFullYear() - i,
  );

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 3 }}>
        <Stack spacing={2}>
          <Autocomplete
            options={yearOptions}
            getOptionLabel={(year) => year.toString()}
            value={selectedYear}
            onChange={(_, value) => {
              if (value) setSelectedYear(value);
            }}
            renderInput={(params) => <TextField {...params} label="Jahr" />}
          />
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
