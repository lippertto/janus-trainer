'use client';

import React from 'react';
import { signOut, useSession } from 'next-auth/react';
import type { JanusSession } from '@/lib/auth';

/**
 * Signs the user out when the server could not refresh the Cognito access token. Without this,
 * the user would keep a session whose access token is stale. Renders nothing.
 */
export function SignOutOnSessionError() {
  const { data } = useSession();
  const hasError = (data as JanusSession | null)?.error !== undefined;
  const signedOut = React.useRef(false);

  React.useEffect(() => {
    if (hasError && !signedOut.current) {
      signedOut.current = true;
      void signOut({ callbackUrl: '/login' });
    }
  }, [hasError]);

  return null;
}
