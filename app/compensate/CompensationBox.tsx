import React from 'react';
import { JanusSession } from '@/lib/auth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CompensationDto, UserDto } from '@/lib/dto';
import { API_COMPENSATIONS, API_PAYMENTS } from '@/lib/routes';
import { CURRENT_PAYMENT_ID } from '@/app/compensate/PaymentSelection';
import CompensationTable from '@/app/compensate/CompensationTable';
import { generateSepaXml } from '@/lib/sepa-generation';
import Stack from '@mui/system/Stack';
import Button from '@mui/material/Button';
import { showError } from '@/lib/notifications';
import { queryCompensations } from '@/lib/shared-queries';

function handleSepaGeneration(compensations: CompensationDto[]) {
  const sepaXml = generateSepaXml(compensations);
  const blob = new Blob([sepaXml], { type: 'text/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = `trainer-vergütung-${new Date()
    .toISOString()
    .substring(0, 10)}.xml`;
  link.href = url;
  link.click();
}

export default function CompensationBox(props: {
  session: JanusSession;
  selectedPaymentId: number;
  trainer: UserDto | null;
}) {
  const queryClient = useQueryClient();
  let compensations = queryCompensations(
    props.session.accessToken,
    props.selectedPaymentId,
  );
  if (props.trainer?.id) {
    compensations = compensations.filter(
      (c) => c.user.id === props.trainer!.id,
    );
  }

  const markAsCompensated = useMutation({
    mutationFn: () => {
      const allIds = compensations.flatMap((c) => c.correspondingIds);
      let body = JSON.stringify({
        trainingIds: allIds,
      });
      return fetch('/api/payments', { method: 'POST', body: body });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [API_COMPENSATIONS, props.selectedPaymentId],
      });
      queryClient.invalidateQueries({ queryKey: [API_PAYMENTS] });
    },
    onError: (error) => {
      showError(
        'Konnte Zahlungen nicht als überwiesen markieren',
        error.message,
      );
    },
  });

  return (
    <Stack>
      <CompensationTable compensations={compensations} />
      <Stack direction={'row'}>
        <Button
          onClick={() => handleSepaGeneration(compensations)}
          disabled={Boolean(props.trainer)}
        >
          SEPA XML generieren
        </Button>
        <Button
          disabled={
            props.selectedPaymentId !== CURRENT_PAYMENT_ID ||
            Boolean(props.trainer)
          }
          onClick={() => {
            markAsCompensated.mutate();
          }}
        >
          Alle als überwiesen markieren
        </Button>
      </Stack>
    </Stack>
  );
}