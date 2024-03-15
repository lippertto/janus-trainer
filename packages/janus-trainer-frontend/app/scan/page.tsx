'use client';

import React from 'react';

import { useSession } from 'next-auth/react';

import LoginRequired from '@/components/LoginRequired';
import { JanusSession } from '@/lib/auth';
import { AppUserDto } from 'janus-trainer-dto';
import AppUserDialog from './AppUserDialog';
import { getAppUser } from '@/lib/api-app-users';
import { showError } from '@/lib/notifications';
import { useDebouncedCallback } from 'use-debounce';

import { Scanner } from './Scanner';
import { ScannedUser, ScannedUserTable } from './ScannedUserTable';
import { v4 as uuidv4 } from 'uuid';
import useLocalStorageState from 'use-local-storage-state';

import dayjs from 'dayjs';
import 'dayjs/locale/de';
import { useConfirm } from 'material-ui-confirm';
dayjs.locale('de');

function serializeScannedUser(scannedUser: unknown): string {
  const value = scannedUser as ScannedUser[];
  return JSON.stringify(
    value.map((v) => ({
      ...v,
      scanDate: v.scanDate.valueOf(),
    })),
  );
}

function deserializeScanneUser(value: string): ScannedUser {
  const decoded = JSON.parse(value);
  return decoded.map((v: ScannedUser) => ({
    ...v,
    scanDate: dayjs(v.scanDate),
  }));
}

export default function ScanPage() {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;
  const confirm = useConfirm();

  const [currentProfile, setCurrentProfile] = React.useState<AppUserDto | null>(
    null,
  );

  const [scannedUsers, setScannedUsers] = useLocalStorageState<ScannedUser[]>(
    'scanned-users',
    {
      defaultValue: [],
      serializer: {
        stringify: serializeScannedUser,
        parse: deserializeScanneUser,
      },
    },
  );

  /**
   * If the backend is not working correctly, every scan will trigger an error message,
   * which is something that we do not want. Hence, we debounce the call to showError
   */
  const debouncedShowError = useDebouncedCallback(
    (message: string, details?: string) => {
      showError(message, details);
    },
    1000,
  );

  const handleSuccess = React.useCallback(
    async (appUserId: string) => {
      if (!session?.accessToken) return;

      getAppUser(session?.accessToken, appUserId)
        .then((profile) => {
          if (!profile) {
            debouncedShowError('Profil nicht gefunden!');
          } else {
            setCurrentProfile(profile);
          }
        })
        .catch((e) => {
          debouncedShowError('Fehler bei der Profil-Abfrage', e.message);
        });
    },
    [debouncedShowError, setCurrentProfile, session?.accessToken],
  );

  const handleConfirmScan = React.useCallback(
    (profile: AppUserDto) => {
      setScannedUsers([
        ...scannedUsers,
        { user: profile, scanDate: dayjs(), id: uuidv4() },
      ]);
    },
    [scannedUsers, setScannedUsers],
  );

  const handleDeleteUser = React.useCallback(
    (id: string) => {
      return () => {
        confirm({ title: 'Registrierung löschen?' }).then(() => {
          setScannedUsers(scannedUsers.filter((v) => v.id !== id));
        });
      };
    },
    [scannedUsers, setScannedUsers, confirm],
  );

  const handleClearAll = React.useCallback(() => {
    confirm({ title: 'Alle Registrierungen löschen?' }).then(() => {
      setScannedUsers([]);
    });
  }, [setScannedUsers, confirm]);

  if (authenticationStatus !== 'authenticated') {
    return <LoginRequired authenticationStatus={authenticationStatus} />;
  }

  return (
    <>
      <Scanner handleSuccess={handleSuccess} active={currentProfile === null} />
      <ScannedUserTable
        scannedUsers={scannedUsers}
        handleDeleteUser={handleDeleteUser}
        handleClearAll={handleClearAll}
      />
      <AppUserDialog
        open={currentProfile !== null}
        profile={currentProfile}
        handleClose={() => {
          setCurrentProfile(null);
        }}
        handleConfirm={handleConfirmScan}
      />
    </>
  );
}
