'use client';

import Toolbar from '@mui/material/Toolbar';
import AppBar from '@mui/material/AppBar';
import IconButton from '@mui/material/IconButton';
import MenuIcon from '@mui/icons-material/Menu';
import Typography from '@mui/material/Typography';
import React from 'react';
import JanusDrawer from './JanusDrawer';
import HelpButton from '@/app/HelpButton';

export default function JanusAppbar() {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

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
            Janus Sportstunden App
          </Typography>
         <HelpButton/>
        </Toolbar>
      </AppBar>
      <JanusDrawer state={drawerOpen} setState={setDrawerOpen} />
    </React.Fragment>
  );
}
