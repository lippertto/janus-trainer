'use client';
import Grid from '@mui/material/Unstable_Grid2'; // Grid version 2
import React from 'react';
import CompensationTable from './CompensationTable';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';
import { generateSepaXml } from '../../lib/sepa-generation';
import { useSession } from 'next-auth/react';
import LoginRequired from '../../components/LoginRequired';
import { JanusSession } from '@/lib/auth';
import { getCompensations } from '@/lib/api-compensations';
import { CompensationDto } from '@/lib/dto';
import { showError } from '@/lib/notifications';
import { markTrainingsAsCompensated } from '@/lib/api-trainings';

export default function PaymentPage() {
  const [compensations, setCompensations] = React.useState<
    CompensationDto[]
  >([]);

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  const refresh = React.useCallback(() => {
    if (session?.accessToken) {
      getCompensations(session.accessToken)
        .then((v) => setCompensations(v))
        .catch((e) => {
          showError('Konnte die Aufwände nicht laden', e.message);
        });
    }
  }, [session?.accessToken, setCompensations]);

  function markAsCompensated() {
    const allIds = compensations.flatMap((c) => c.correspondingIds);
    markTrainingsAsCompensated(session?.accessToken, allIds).then(() =>
      refresh(),
    );
  }

  function handleSepaGeneration() {
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

  React.useEffect(() => {
    refresh();
  }, [session?.accessToken, refresh]);

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <Grid container spacing={2}>
      <Grid xsOffset={'auto'} display={'flex'} justifyContent={'center'}>
        <Button onClick={refresh} endIcon={<RefreshIcon />}>
          Neu laden
        </Button>
      </Grid>
      <Grid xs={12}>
        <CompensationTable compensations={compensations} />
      </Grid>
      <Grid xs={5} xsOffset={'auto'}>
        <Button
          disabled={compensations.length === 0}
          onClick={handleSepaGeneration}
        >
          SEPA XML generieren
        </Button>
      </Grid>
      <Grid xs={5} xsOffset={'auto'}>
        <Button onClick={markAsCompensated}>
          Alle als überwiesen markieren
        </Button>
      </Grid>
    </Grid>
  );
}
