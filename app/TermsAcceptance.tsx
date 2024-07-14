"use client";

import { JanusSession } from '@/lib/auth';

import React from 'react';
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { userSuspenseQuery } from '@/lib/shared-queries';
import Markdown from 'react-markdown';
import Typography from '@mui/material/Typography';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import Box from '@mui/material/Box';
import { API_USERS } from '@/lib/routes';
import { showError } from '@/lib/notifications';
import { CircularProgress } from '@mui/material';
import { useSession } from 'next-auth/react';

const CURRENT_TERMS_VERSION = '2024-07-13';

function TermsDialog(props: { tosData: string, handleAccept: () => void }) {
  const [accepted, setAccepted] = React.useState<boolean>(false);
  const [clicked, setClicked] = React.useState<boolean>(false);
  return <Dialog open={true}>
    <DialogTitle>Nutzungsbedingungen</DialogTitle>
    <DialogContent>
      <Box maxHeight={'80%'}>
        <Stack>
          <Markdown children={props.tosData}
                    components={{
                      h1: ({ children }) => (<Typography variant={'h1'} children={children} />),
                      h2: ({ children }) => (<Typography variant={'h2'} children={children} />),
                      h3: ({ children }) => (<Typography variant={'h3'} children={children} />),
                      h4: ({ children }) => (<Typography variant={'h4'} children={children} />),
                      p: ({ children }) => (<Typography children={children} />),
                    }}
          />
          <FormGroup>
            <FormControlLabel control={<Checkbox checked={accepted} onChange={(e) => {
              setAccepted(e.target.checked);
            }} />} label={'Ich akzeptiere die Nutzungsbedingungen'} />
          </FormGroup>
        </Stack>
      </Box>
    </DialogContent>

    <DialogActions>
      {clicked ? <CircularProgress /> :
        <Button
          disabled={!accepted}
          onClick={() => {
            props.handleAccept();
            setClicked(true);
          }}
        >{accepted ? 'Schließen' : 'Erst akzeptieren'}</Button>
      }
    </DialogActions>
  </Dialog>;
}

function TermsAcceptanceContents(props: { session: JanusSession }) {
  const { session } = { ...props };
  const queryClient = useQueryClient();

  const { data: tosData } = useSuspenseQuery({
      queryKey: ['terms-and-conditions'],
      queryFn: async () => {
        const response = await fetch('/terms-and-conditions.md');
        return await response.text();
      },
    },
  );
  const termsVersion = tosData.match(/Version\s*:\s*(.*)/im)![1];

  const { data: user } = userSuspenseQuery(session.userId, session.accessToken);

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_USERS}/${session.userId}`,
        { method: 'PATCH', body: JSON.stringify({ termsAcceptedVersion: termsVersion }) },
      );
      if (!response.ok) {
        throw new Error();
      }
    }, onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [API_USERS, session.userId] });
    }, onError: () => {
      showError('Konnte Nutzungsbedingungen nicht bestätigen. Bitte erneut versuchen');
    },
  });

  if (user.termsAcceptedVersion === CURRENT_TERMS_VERSION) {
    return <></>;
  }

  return <TermsDialog tosData={tosData} handleAccept={acceptTermsMutation.mutate} />;
}

export default function TermsAcceptance(): React.ReactNode {
  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (!session) {
    return <></>;
  }

  return <TermsAcceptanceContents session={session} />;
}
