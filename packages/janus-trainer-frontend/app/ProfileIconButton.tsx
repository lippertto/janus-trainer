import IconButton from '@mui/material/IconButton';
import React from 'react';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { Avatar } from '@mui/material';
import { signIn, signOut, useSession } from 'next-auth/react';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import type { JanusSession } from '../lib/auth';

function menuItemsLoggedIn() {
  return (
    <div>
      <MenuItem
        onClick={() => {
          signOut();
        }}
      >
        Log out
      </MenuItem>
    </div>
  );
}

function menuItemsLoggedOut(closeMenu: () => void) {
  return (
    <MenuItem
      onClick={() => {
        closeMenu();
        signIn();
      }}
    >
      Login
    </MenuItem>
  );
}

function authMenu(
  anchorEl: HTMLElement | null,
  loggedIn: boolean,
  closeMenu: () => void,
) {
  return (
    <Menu
      id="menu-appbar"
      anchorEl={anchorEl}
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      keepMounted
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      open={Boolean(anchorEl)}
      onClose={closeMenu}
    >
      {loggedIn ? menuItemsLoggedIn() : menuItemsLoggedOut(closeMenu)}
    </Menu>
  );
}

function getAccountCircle(trainerName?: string) {
  if (!trainerName)
    return (
      <Avatar>
        <PersonOutlineIcon />
      </Avatar>
    );
  // get a list of all uppercase letters
  const allUppercaseLetters = trainerName.replace(/[a-z]/g, '');
  return <Avatar>{allUppercaseLetters}</Avatar>;
}

export function ProfileIconButton() {
  const { data, status } = useSession();
  const session = data as JanusSession;
  const loggedIn = status === 'authenticated';

  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);

  const handleOpenProfileMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseProfileMenu = () => {
    setAnchorEl(null);
  };

  return (
    <>
      <IconButton size="large" onClick={handleOpenProfileMenu} color="inherit">
        {getAccountCircle(loggedIn ? session.name : '')}
      </IconButton>

      {authMenu(anchorEl, loggedIn, handleCloseProfileMenu)}
    </>
  );
}
