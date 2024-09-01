import React, { Suspense } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import { PaymentDto } from '@/lib/dto';
import { JanusSession } from '@/lib/auth';
import { centsToHumanReadable, dateToHumanReadable } from '@/lib/formatters';
import { compareByField } from '@/lib/sort-and-filter';

export const CURRENT_PAYMENT_ID = -1;

function PaymentListContents(props: {
  payments: PaymentDto[],
  selectedPaymentId: number,
  setSelectedPaymentId: (v: number) => void,
}) {
  const { selectedPaymentId, setSelectedPaymentId } = { ...props };

  const sortedPayments = props.payments
    .toSorted((a, b) => (compareByField(a, b, 'createdAt')))
    .reverse();

  return <List>
    <ListItemButton
      key={CURRENT_PAYMENT_ID}
      onClick={() => setSelectedPaymentId(CURRENT_PAYMENT_ID)}
      selected={selectedPaymentId === CURRENT_PAYMENT_ID}
    >
      <ListItemText>Offen</ListItemText>
    </ListItemButton>

    {sortedPayments.map((p) => (
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
  payments: PaymentDto[],
  selectedPaymentId: number,
  setSelectedPaymentId: (v: number) => void,
}) {
  return <Paper>
    <Stack padding={3}>
      <Typography variant="h5">Auszahlungen</Typography>

      <Suspense fallback={<CircularProgress />}>
        <PaymentListContents
          {...props}
        />
      </Suspense>

    </Stack>
  </Paper>;
}