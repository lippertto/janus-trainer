'use client';
import React, { useEffect } from 'react';

import { useSession } from 'next-auth/react';

import { JanusSession } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';
import Stack from '@mui/system/Stack';
import { CompensationClassDto } from '@/lib/dto';
import { compensationClassesQuery, resultHasData } from '@/lib/shared-queries';
import { compareByField } from '@/lib/sort-and-filter';
import { CompensationValueCard } from '@/app/configure/compensation-values/CompensationValueCard';
import CompensationClassCard from '@/app/configure/compensation-values/CompensationClassCard';

function CompensationvalueConfigurationPageContents({
  session,
}: {
  session: JanusSession;
}) {
  const [activeCompensationClass, setActiveCompensationClass] =
    React.useState<CompensationClassDto | null>(null);
  const [compensationClasses, setCompensationClasses] = React.useState<
    CompensationClassDto[]
  >([]);

  const compensationClassesResult = compensationClassesQuery(
    session.accessToken,
  );
  useEffect(() => {
    if (resultHasData(compensationClassesResult)) {
      setCompensationClasses(
        compensationClassesResult
          .data!.toSorted((a, b) => compareByField(a, b, 'description'))
          .toReversed(),
      );
    }
  }, [compensationClassesResult.data]);

  return (
    <>
      <Stack direction={'row'} spacing={5}>
        <CompensationClassCard
          compensationClasses={compensationClasses}
          setCompensationClasses={setCompensationClasses}
          activeCompensationClass={activeCompensationClass}
          setActiveCompensationClass={setActiveCompensationClass}
          accessToken={session.accessToken}
        />

        <CompensationValueCard
          activeCompensationClass={activeCompensationClass}
          setActiveCompensationClass={setActiveCompensationClass}
          setCompensationClasses={setCompensationClasses}
          compensationClasses={compensationClasses}
          accessToken={session.accessToken}
        />
      </Stack>
    </>
  );
}

export default function ComepnsationValuesConfigurationPage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return <CompensationvalueConfigurationPageContents session={session} />;
}
