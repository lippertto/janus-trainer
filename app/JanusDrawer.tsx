import React from 'react';

import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import Link from '@mui/material/Link';

import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';

import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import HomeIcon from '@mui/icons-material/Home';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SettingsIcon from '@mui/icons-material/Settings';
import SportsIcon from '@mui/icons-material/Sports';

import { auth, JanusSession } from '@/lib/auth';
import { useSession } from 'next-auth/react';
import { Group } from '@/lib/dto';
import AccountBoxIcon from '@mui/icons-material/AccountBox';

const ADMIN_LINKS = [
  { text: 'Home', href: '/', icon: HomeIcon },
  { text: 'Eingeben', href: '/enter', icon: EditCalendarIcon },
  { text: 'Freigeben', href: '/approve', icon: AssignmentTurnedInIcon },
  { text: 'Auszahlen', href: '/compensate', icon: AccountBalanceIcon },
  { text: 'Konten', href: '/users', icon: ManageAccountsIcon },
  { text: 'Angebot', href: '/offerings', icon: SportsIcon },
  { text: 'Verwaltung', href: '/configure', icon: SettingsIcon },
  { text: 'Auswertung', href: '/analyze', icon: AnalyticsIcon },
  // { text: 'Scannen', href: '/scan', icon: QrCodeScannerIcon },
  { text: 'Profil', href: '/profile', icon: AccountBoxIcon },
];

const TRAINER_LINKS = [
  { text: 'Home', href: '/', icon: HomeIcon },
  { text: 'Eingeben', href: '/enter', icon: EditCalendarIcon },
  // { text: 'Scannen', href: '/scan', icon: QrCodeScannerIcon },
  { text: 'Profil', href: '/profile', icon: AccountBoxIcon },
];

function JanusDrawerContents({
  state,
  ...props
}: {
  state: boolean;
  session: JanusSession;
  toggleDrawer: (
    value: boolean,
  ) => (event: React.KeyboardEvent | React.MouseEvent) => void;
}) {
  const links =
    props.session.groups.indexOf(Group.ADMINS) >= 0
      ? ADMIN_LINKS
      : TRAINER_LINKS;

  return (
    <Drawer anchor={'left'} open={state} onClose={props.toggleDrawer(false)}>
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

export default function JanusDrawer(props: {
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

      props.setState(newState);
    };

  const { data, status: authenticationStatus } = useSession();
  const session = data as JanusSession;

  if (authenticationStatus !== 'authenticated') {
    return (
      <Drawer anchor="left" open={props.state} onClose={toggleDrawer(false)} />
    );
  }

  return (
    <JanusDrawerContents
      toggleDrawer={toggleDrawer}
      session={session}
      {...props}
    />
  );
}
