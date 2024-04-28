import React from 'react';

import Box from '@mui/system/Box';
import JanusAppbar from './JanusAppbar';
import JanusProviders from './JanusProviders';

export const metadata = {
  title: 'Janus Trainerstunden',
  description: 'Verwaltung von Trainerstunden für den SC Janus',
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
            <JanusAppbar />
            <Box sx={{ pt: 5 }}>{children}</Box>
          </>
        </JanusProviders>
      </body>
    </html>
  );
}
