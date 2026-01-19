import React from 'react';
import HomePage from './HomePage';
import { auth } from '@/lib/auth';
import LoginRequired from '@/components/LoginRequired';

export default async function StartPage() {
  const session = await auth();

  return (
    <div>
      {session ? (
        <HomePage />
      ) : (
        <LoginRequired authenticationStatus={'unauthenticated'} />
      )}
    </div>
  );
}
