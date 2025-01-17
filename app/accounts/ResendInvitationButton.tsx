'use client';

import { loginInfoSuspenseQuery, resendInvitation } from '@/lib/shared-queries';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { showError, showSuccess } from '@/lib/notifications';
import React from 'react';

export default function ResendInvitationButton(props: {
  accessToken: string;
  userId: string;
  email: string;
}) {
  const handleClick = () => {
    resendInvitation(props.accessToken, props.userId)
      .then(() => {
        showSuccess(`Neue Einladungs-Email an ${props.email} versendet`);
      })
      .catch((e) => {
        showError(
          `Konnte Einladungs-Email an ${props.email} nicht versenden. ${e}`,
        );
      });
  };

  const { data: loginInfo } = loginInfoSuspenseQuery(
    props.accessToken,
    props.userId,
  );
  if (loginInfo.confirmed) {
    return <Typography>Account aktiv</Typography>;
  } else {
    return <Button onClick={handleClick}>Neue Einladungs-Email</Button>;
  }
}
