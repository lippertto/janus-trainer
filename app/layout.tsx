import React from 'react';

import Box from '@mui/system/Box';
import JanusAppbar from './JanusAppbar';
import JanusProviders from './JanusProviders';
import TermsAcceptance from '@/app/TermsAcceptance';

export const metadata = {
  title: 'Janus Sportstunden',
  description: 'Verwaltung von Sportstunden für den SC Janus',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactElement;
}) {
  return (
    <html lang="de">
      <head>
        {/*<script src="http://localhost:8097"></script>*/}
        <title>Janus Trainer App</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        <JanusProviders>
          <>
            <TermsAcceptance />
            <JanusAppbar />
            <Box sx={{ pt: 3 }}>{children}</Box>
          </>
        </JanusProviders>
      </body>
    </html>
  );
}
