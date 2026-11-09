'use client';

import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Typography from '@mui/material/Typography';
import React from 'react';
import { usePathname } from 'next/navigation';
import JanusDrawer from './JanusDrawer';
import HelpButton from '@/app/HelpButton';

export default function JanusAppbar() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const pathname = usePathname();

  // The login page is a standalone screen. A nested layout cannot remove the app bar, because it
  // renders inside the root layout, hence the check here.
  if (pathname === '/login') {
    return null;
  }

  return (
    <React.Fragment>
      <AppBar position="static">
        <Toolbar>
          <IconButton
            size="large"
            edge="start"
            color="inherit"
            aria-label="menu"
            sx={{ mr: 2 }}
            onClick={() => {
              setDrawerOpen(!drawerOpen);
            }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Janus Abrechnungs-App
          </Typography>
          <HelpButton />
        </Toolbar>
      </AppBar>
      <JanusDrawer state={drawerOpen} setState={setDrawerOpen} />
    </React.Fragment>
  );
}
