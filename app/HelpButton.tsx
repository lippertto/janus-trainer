import React from 'react';
import { usePathname } from 'next/navigation';
import IconButton from '@mui/material/IconButton';
import HelpIcon from '@mui/icons-material/Help';
import DialogTitle from '@mui/material/DialogTitle';
import { DialogContentText } from '@mui/material';
import DialogContent from '@mui/material/DialogContent';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';

function EnterHelpText() {
  return <React.Fragment>
    <DialogContentText>
      Auf dieser Seite kannst du die Trainings eingeben, die du gegeben hast.
    </DialogContentText>
    <DialogContentText>
      <b>Training hinzufügen</b> Um ein neues Training einzugeben, klick auf "Training hinzufügen".
      In der Eingabemaske kannst du die Kurse und Pauschalen auswählen, die das Büro für dich hinterlegt hat.
      Wenn etwas fehlt, melde dich bitte beim Büro.
    </DialogContentText>
    <DialogContentText>
      <b>Training bearbeiten</b> Um ein Training zu bearbeiten oder zu löschen, klicke auf den Stift rechts von dem dazugehörigen Eintrag.
      Kurse, die schon freigegeben oder überwiesen worden sind, können nicht mehr bearbeitet werden.
    </DialogContentText>
    <DialogContentText>
      <b>Freigabeprozess</b> Wenn du das Training speichert, wird es vom Büro freigegeben und die zugehörigen Pauschalen am Ende des Quartals
      gesammelt überwiesen.
      Du siehst den Status deines Trainings beim dazugehörigen Eintrag, er ist entweder <em>neu</em>, <em>freigegeben</em> oder <em>überwiesen</em>.
    </DialogContentText>
  </React.Fragment>;
}

function ProfileHelpText() {
  return <React.Fragment>
    <DialogContentText>
      Auf dieser Seite siehst du, welche Informationen das Büro für dich hinterlegt hat. Wenn z.B. ein Kurs fehlt oder falsch eingetragen ist, melde dich bitte beim Büro.
    </DialogContentText>
    <DialogContentText>
      <b>IBAN</b>. Wird verwendet, um die Pauschalen am Ende des Quartals zu überweisen.
      Das ist einzigen Wert, den du selbst ändern kannst. Dafür klickst du auf den Stift-Knopf rechts neben
      deiner IBAN.
    </DialogContentText>
    <DialogContentText>
      <b>Pauschalen-Gruppe</b> bezeichnet die für dich freigegebenen Pauschalen. Das hängt hauptsächlich davon ab ob du eine Qualifikation hast oder nicht.
      Zusätzlich gibt es eine weitere Pauschale für Liga-Spiele.
    </DialogContentText>
    <DialogContentText>
      <b>Logout</b> Wenn du möchtest, kannst du dich ausloggen, aber das sollte normalerweise nicht notwendig sein.
      Aktuell gibt es beim Ausloggen noch einen Fehler. Du wirst nur aus der App nicht aus cognito ausgeloggt.
      Cognito ist der externe Dienst, der die Anmeldedaten verwaltet.
    </DialogContentText>
  </React.Fragment>;
}

function dialogContents(pathname: string) {
  switch (pathname) {
    case '/':
      return <DialogContentText>Wenn du auf den ? Knopf drückst, bekommst du Hilfe für die aktuelle Funktionalität
        angezeigt.</DialogContentText>;
    case '/enter':
      return <EnterHelpText />;
    case '/profile':
      return <ProfileHelpText />;
    default:
      return <DialogContentText>Leider keine Hilfe verfügbar</DialogContentText>;
  }
}

function HelpDialog(props: { open: boolean, onClose: () => void, pathname: string }) {
  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>Hilfe</DialogTitle>
      <DialogContent>
        {dialogContents(props.pathname)}
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function HelpButton() {
  const pathname = usePathname();

  const [showHelp, setShowHelp] = React.useState<boolean>(false);

  return <React.Fragment>
    <IconButton color={'inherit'} onClick={() => setShowHelp(true)}><HelpIcon /></IconButton>
    <HelpDialog open={showHelp} onClose={() => setShowHelp(false)}
                pathname={pathname}
    />
  </React.Fragment>;
}