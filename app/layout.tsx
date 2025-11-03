import React from 'react';

import Box from '@mui/system/Box';
import JanusAppbar from './JanusAppbar';
import JanusProviders from './JanusProviders';
import TermsAcceptance from '@/app/TermsAcceptance';

export const metadata = {
  title: 'Janus Online Trainings Abrechnungen',
  description: 'Verwaltung von Abrechnungen für den SC Janus',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        {/*<script src="http://localhost:8097"></script>*/}
        <title>Janus Online Trainings Abrechnungen</title>
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
