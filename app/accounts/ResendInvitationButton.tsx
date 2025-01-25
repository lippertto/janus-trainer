'use client';

import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { showError, showSuccess } from '@/lib/notifications';
import React from 'react';
import { LoginInfo } from '@/lib/dto';

export default function ResendInvitationButton(props: {
  queryLoginInfo: (userId: string) => LoginInfo;
  resendInvitation: (userId: string) => Promise<void>;
  userId: string;
  email: string;
}) {
  const handleClick = () => {
    props
      .resendInvitation(props.userId)
      .then(() => {
        showSuccess(`Neue Einladungs-Email an ${props.email} versendet`);
      })
      .catch((e) => {
        showError(
          `Konnte Einladungs-Email an ${props.email} nicht versenden. ${e}`,
        );
      });
  };

  const loginInfo = props.queryLoginInfo(props.userId);

  if (loginInfo.confirmed) {
    return <Typography>Account aktiv</Typography>;
  } else {
    return <Button onClick={handleClick}>Neue Einladungs-Email</Button>;
  }
}
