import React from 'react';
import { CompensationDto, UserDto } from '@/lib/dto';
import { CURRENT_PAYMENT_ID } from '@/app/compensate/PaymentSelection';
import CompensationTable from '@/app/compensate/CompensationTable';
import Stack from '@mui/system/Stack';
import Button from '@mui/material/Button';
import { showError } from '@/lib/notifications';

export function findInvalidCompensations(
  compensations: CompensationDto[],
): CompensationDto[] {
  return compensations.filter((c) => c.totalCompensationCents <= 0);
}

export function formatInvalidCompensationError(
  compensations: CompensationDto[],
): string {
  const invalidLines = compensations
    .map(
      (c) =>
        `${c.user.name} / ${c.courseName} (${(c.totalCompensationCents / 100).toFixed(2)} €)`,
    )
    .join(', ');
  return `Ungültige Beträge (negativ oder 0,00 €): ${invalidLines}`;
}

export default function CompensationBox(props: {
  compensations: CompensationDto[];
  selectedPaymentId: number;
  /** A trainer id to filter. If filtering is active, no sepa xml files can be generated because the logic is currently undefined. */
  trainer: Pick<UserDto, 'id'> | null;
  onMarkAsCompensated: (trainingIds: number[]) => Promise<void>;
  onGenerateSepa: (compensations: CompensationDto[]) => void;
}) {
  // if we have a filter on the trainer id, look only at those
  let compensations = props.compensations;
  if (props.trainer?.id) {
    compensations = props.compensations.filter(
      (c) => c.user.id === props.trainer!.id,
    );
  }

  const invalidCompensations = findInvalidCompensations(compensations);

  return (
    <Stack>
      <CompensationTable compensations={compensations} />
      <Stack direction={'row'}>
        <Button
          onClick={() => {
            if (invalidCompensations.length > 0) {
              showError(formatInvalidCompensationError(invalidCompensations));
            } else {
              props.onGenerateSepa(compensations);
            }
          }}
          disabled={Boolean(props.trainer)}
        >
          SEPA XML generieren
        </Button>
        <Button
          disabled={
            props.selectedPaymentId !== CURRENT_PAYMENT_ID ||
            Boolean(props.trainer)
          }
          onClick={async () => {
            if (invalidCompensations.length > 0) {
              showError(formatInvalidCompensationError(invalidCompensations));
            } else {
              const allIds = compensations.flatMap((c) => c.correspondingIds);
              try {
                await props.onMarkAsCompensated(allIds);
              } catch (error) {
                showError(
                  'Konnte Zahlungen nicht als überwiesen markieren',
                  error instanceof Error ? error.message : null,
                );
              }
            }
          }}
        >
          Alle als überwiesen markieren
        </Button>
      </Stack>
    </Stack>
  );
}
