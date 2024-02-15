import Drawer from '@mui/material/Drawer';

import HomeIcon from '@mui/icons-material/Home';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import SettingsIcon from '@mui/icons-material/Settings';

import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import Link from '@mui/material/Link';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import React from 'react';
import { Group } from 'janus-trainer-dto';
import { JanusSession } from '../lib/auth';
import { useSession } from 'next-auth/react';

const ADMIN_LINKS = [
  { text: 'Home', href: '/', icon: HomeIcon },
  { text: 'Eingeben', href: '/enter', icon: EditCalendarIcon },
  { text: 'Freigeben', href: '/approve', icon: AssignmentTurnedInIcon },
  { text: 'Auszahlen', href: '/compensate', icon: AccountBalanceIcon },
  { text: 'Nutzer anlegen', href: '/manage-users', icon: ManageAccountsIcon },
  { text: 'Verwaltung', href: '/configure', icon: SettingsIcon },
];

const TRAINER_LINKS = [
  { text: 'Home', href: '/', icon: HomeIcon },
  { text: 'Eingeben', href: '/enter', icon: EditCalendarIcon },
];

export default function JanusDrawer({
  state,
  setState,
}: {
  state: boolean;
  setState: (state: boolean) => void;
}) {
  const toggleDrawer =
    (newState: boolean) =>
    (event: React.KeyboardEvent | React.MouseEvent): void => {
      if (
        event.type === 'keydown' &&
        ((event as React.KeyboardEvent).key === 'Tab' ||
          (event as React.KeyboardEvent).key === 'Shift')
      ) {
        return;
      }

      setState(newState);
    };

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;
  let links = [TRAINER_LINKS[0]]; // only home button
  if (authenticationStatus === 'authenticated') {
    links =
      session.groups.indexOf(Group.ADMINS) >= 0 ? ADMIN_LINKS : TRAINER_LINKS;
  }

  return (
    <Drawer anchor={'left'} open={state} onClose={toggleDrawer(false)}>
      <List>
        {links.map((oneLink) => (
          <ListItem key={oneLink.text} disablePadding>
            <ListItemButton component={Link} href={oneLink.href}>
              <ListItemIcon>
                <oneLink.icon />
              </ListItemIcon>
              <ListItemText primary={oneLink.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Drawer>
  );
}
