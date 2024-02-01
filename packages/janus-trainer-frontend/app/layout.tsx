import React from 'react';

import Box from '@mui/system/Box';
import JanusAppbar from './JanusAppbar';
import JanusProviders from './JanusProviders';

export const metadata = {
  title: 'Next.js',
  description: 'Generated by Next.js',
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
        <link rel="icon" href="/static/favicon.ico" sizes="any" />
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
