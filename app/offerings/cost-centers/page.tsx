'use client';
import React from 'react';

import { useSession } from 'next-auth/react';

import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import CostCenterTable from '@/app/offerings/cost-centers/CostCenterTable';
import { costCentersQuery } from '@/app/offerings/cost-centers/queries';
import {
  CostCenterCreateRequest,
  CostCenterDto,
  CostCenterUpdateRequest,
} from '@/lib/dto';
import Stack from '@mui/system/Stack';
import ButtonGroup from '@mui/material/ButtonGroup';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import { useConfirm } from 'material-ui-confirm';
import { createInApi, deleteFromApi, updateInApi } from '@/lib/fetch';
import { API_COST_CENTERS } from '@/lib/routes';
import { showError, showSuccess } from '@/lib/notifications';
import { CostCenterDialog } from '@/app/offerings/cost-centers/CostCenterDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography } from '@mui/material';

function ConfigurationPageContents({ session }: { session: JanusSession }) {
  const queryClient = useQueryClient();

  const [activeCostCenter, setActiveCostCenter] =
    React.useState<CostCenterDto | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  let { data: costCenters } = costCentersQuery(session.accessToken);

  const confirm = useConfirm();
  const handleDelete = (activeCostCenter: CostCenterDto | null) => {
    confirm({
      title: 'Kostenstelle löschen?',
      description: `Soll die Kostenstelle "${activeCostCenter?.name}" gelöscht werden?`,
      confirmationButtonProps: { autoFocus: true },
    }).then(({ confirmed }) => {
      if (!activeCostCenter) return;
      if (!confirmed) return;
      deleteFromApi(API_COST_CENTERS, activeCostCenter, session.accessToken)
        .then((deleted) => {
          queryClient.invalidateQueries({ queryKey: [API_COST_CENTERS] });
          showSuccess(`Kostenstelle ${activeCostCenter.name} wurde gelöscht`);
        })
        .catch((err) => {
          showError(
            `Konnte Kostenstelle ${activeCostCenter.name} nicht löschen`,
            err.message,
          );
        });
    });
  };

  const costCenterAddMutation = useMutation({
    mutationFn: (data: CostCenterCreateRequest) => {
      return createInApi<CostCenterDto>(
        API_COST_CENTERS,
        data,
        session.accessToken,
      );
    },
    onSuccess: (data) => {
      showSuccess(`Kostenstelle ${data.name} erstellt`);
      queryClient.invalidateQueries({ queryKey: [API_COST_CENTERS] });
    },
    onError: () => {
      showError('Konnte Kostenstelle nicht hinzufügen');
    },
  });

  const costCenterUpdateMutation = useMutation({
    mutationFn: (data: CostCenterUpdateRequest) => {
      return updateInApi<CostCenterDto>(
        API_COST_CENTERS,
        activeCostCenter!.id,
        data,
        session.accessToken,
      );
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [API_COST_CENTERS] });
      showSuccess(`Kostenstelle ${data.name} aktualisiert`);
    },
    onError: () => {
      showError('Konnte Kostenstelle nicht aktualisieren');
    },
  });

  return (
    <Stack spacing={2}>
      <Typography variant={'h5'}>Kostenstellen</Typography>

      <CostCenterDialog
        open={dialogOpen}
        handleClose={() => setDialogOpen(false)}
        handleSave={(data) => {
          if (activeCostCenter) {
            costCenterUpdateMutation.mutate(data);
          } else {
            costCenterAddMutation.mutate(data);
          }
        }}
        toEdit={activeCostCenter}
        assignedNumbers={costCenters
          .filter((cc) => cc.deletedAt === null)
          .filter((cc) => cc.id !== activeCostCenter?.id)
          .map((cc) => cc.costCenterId)}
      />

      <ButtonGroup>
        <Button
          startIcon={<DeleteIcon />}
          onClick={() => handleDelete(activeCostCenter)}
          disabled={!activeCostCenter || activeCostCenter.deletedAt !== null}
        >
          löschen
        </Button>

        <Button
          onClick={() => {
            setActiveCostCenter(null);
            setDialogOpen(true);
          }}
        >
          Hinzufügen
        </Button>

        <Button
          onClick={() => {
            setDialogOpen(true);
          }}
          disabled={!activeCostCenter || activeCostCenter.deletedAt !== null}
        >
          Bearbeiten
        </Button>
      </ButtonGroup>
      <CostCenterTable
        costCenters={costCenters}
        activeCostCenter={activeCostCenter}
        setActiveCostCenter={setActiveCostCenter}
      />
    </Stack>
  );
}

export default function ConfigurationPage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <ConfigurationPageContents session={session} />;
}
