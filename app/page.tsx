import React from 'react';
import { HomePage } from '@/app/HomePage';
import { auth } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';

export default async function StartPage() {
  const session = await auth();

  return (
    <div>
      {session ? (
        <HomePage userId={session.userId} />
      ) : (
        <LoginRequired authenticationStatus={'unauthenticated'} />
      )}
    </div>
  );
}
