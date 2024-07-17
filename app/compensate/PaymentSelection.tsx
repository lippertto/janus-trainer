import React, { Suspense } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchListFromApi } from '@/lib/fetch';
import { PaymentDto } from '@/lib/dto';
import { API_PAYMENTS } from '@/lib/routes';
import { JanusSession } from '@/lib/auth';
import { centsToHumanReadable, dateToHumanReadable } from '@/lib/formatters';
import { compareByStringField } from '@/lib/sort-and-filter';

export const CURRENT_PAYMENT_ID = -1;


function paymentsSuspenseQuery(accessToken: string) {
  return useSuspenseQuery({
    queryKey: [API_PAYMENTS],
    queryFn: () => fetchListFromApi<PaymentDto>(
      `${API_PAYMENTS}`,
      accessToken,
    ),
    staleTime: 10 * 60 * 1000,
  });
}

function PaymentListContents(props: {
  session: JanusSession,
  selectedPaymentId: number,
  setSelectedPaymentId: (v: number) => void,
}) {
  const {selectedPaymentId, setSelectedPaymentId} = {...props};

  const { data: payments } = paymentsSuspenseQuery(props.session.accessToken);
  payments
    .sort((a, b) => (compareByStringField(a, b, "createdAt")))
    .reverse();

  return <List>
    <ListItemButton
      key={CURRENT_PAYMENT_ID}
      onClick={() => setSelectedPaymentId(CURRENT_PAYMENT_ID)}
      selected={selectedPaymentId === CURRENT_PAYMENT_ID}
    >
      <ListItemText>Offen</ListItemText>
    </ListItemButton>

    {payments.map((p) => (
      <ListItemButton
        key={p.id}
        onClick={() => setSelectedPaymentId(p.id)}
        selected={selectedPaymentId === p.id}
      >
        <ListItemText
          primary={dateToHumanReadable(p.createdAt)}
          secondary={centsToHumanReadable(p.totalCents)}
        />
      </ListItemButton>
    ))}
  </List>;
}


export default function PaymentSelection(props: {
  session: JanusSession,
  selectedPaymentId: number,
  setSelectedPaymentId: (v: number) => void,
}) {
  return <Paper>
    <Stack padding={3}>
      <Typography variant="h5">Auszahlungen</Typography>

      <Suspense fallback={<CircularProgress />}>
        <PaymentListContents
          session={props.session}
          selectedPaymentId={props.selectedPaymentId}
          setSelectedPaymentId={props.setSelectedPaymentId}
        />
      </Suspense>

    </Stack>
  </Paper>;
}