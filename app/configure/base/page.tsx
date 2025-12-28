'use client';

import React, { useState } from 'react';

import { useSession } from 'next-auth/react';
import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import {
  getAllConfigurationValues,
  updateConfigurationValueMutation,
} from '@/app/configure/base/queries';
import { ConfigurationValueDto } from '@/lib/dto';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Stack from '@mui/system/Stack';
import { ConfigKey } from '@/app/api/configuration/configuration';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import { BaseConfigurationEditDialog } from '@/app/configure/base/BaseConfigurationEditDialog';
import { useQueryClient } from '@tanstack/react-query';

function titleForConfigurationKey(key: ConfigKey) {
  switch (key) {
    case ConfigKey.MAX_COMPENSATION_CENTS_PER_YEAR:
      return 'Max. Vergütung pro Jahr';
    case ConfigKey.MAX_TRAININGS_PER_COURSE:
      return 'Max. Einheiten an pro Kurs';
    default:
      return 'Unbekannt';
  }
}

function descriptionForConfigurationKey(key: ConfigKey) {
  switch (key) {
    case ConfigKey.MAX_TRAININGS_PER_COURSE:
      return 'Wie viele Einheiten pro Kurs gegeben werden dürfen. Bei Überschreiten des Wertes wird den ÜL eine Warnung angezeigt';
    case ConfigKey.MAX_COMPENSATION_CENTS_PER_YEAR:
      return 'Wie hoch die maximale Vergütung pro Jahr ist. Bei Überschreiten des Wertes wird den ÜL eine Warnung angezeigt';
    default:
      return '';
  }
}

function renderConfigurationValue(config: ConfigurationValueDto) {
  switch (config.key) {
    case ConfigKey.MAX_TRAININGS_PER_COURSE:
      return config.value;
    case ConfigKey.MAX_COMPENSATION_CENTS_PER_YEAR:
      const cents = parseInt(config.value, 10);
      const euros = cents / 100;
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(euros);
    default:
      return '';
  }
}

function BaseConfigurationValueCard(props: {
  config: ConfigurationValueDto;
  onClick: () => void;
  key: string;
}) {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5">
          {titleForConfigurationKey(props.config.key as ConfigKey)}
        </Typography>
        <Typography sx={{ color: 'text.secondary', mb: 1.5 }}>
          {renderConfigurationValue(props.config)}
        </Typography>
        <Typography variant="body2">
          {descriptionForConfigurationKey(props.config.key as ConfigKey)}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size="small" onClick={() => props.onClick()}>
          Bearbeiten
        </Button>
      </CardActions>
    </Card>
  );
}

function BaseConfigurationContents(props: {
  getConfigValues: () => ConfigurationValueDto[];
  updateConfigurationValue: (config: ConfigurationValueDto) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toEdit, setToEdit] = useState<ConfigurationValueDto | null>(null);

  return (
    <>
      <BaseConfigurationEditDialog
        open={dialogOpen}
        toEdit={toEdit}
        handleClose={() => setDialogOpen(false)}
        handleSave={props.updateConfigurationValue}
        title={titleForConfigurationKey(toEdit?.key as ConfigKey)}
      />
      <Stack spacing={2}>
        {props.getConfigValues().map((config) => (
          <BaseConfigurationValueCard
            config={config}
            onClick={() => {
              setToEdit(config);
              setDialogOpen(true);
            }}
            key={config.key}
          />
        ))}
      </Stack>
    </>
  );
}

export default function BaseConfigurationPage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;
  const queryClient = useQueryClient();
  const updateMutation = updateConfigurationValueMutation(
    queryClient,
    session?.accessToken,
  );

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <BaseConfigurationContents
      getConfigValues={() =>
        getAllConfigurationValues(session.accessToken).data
      }
      updateConfigurationValue={updateMutation.mutate}
    />
  );
}
