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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

function EnterHelpText() {
  return (
    <React.Fragment>
      <DialogContentText>
        Auf dieser Seite kannst du die Trainings eingeben, die du gegeben hast.
      </DialogContentText>
      <DialogContentText>
        <b>Training hinzufügen</b> Um ein neues Training einzugeben, klick auf
        "Training hinzufügen". In der Eingabemaske kannst du die Kurse und
        Pauschalen auswählen, die das Büro für dich hinterlegt hat. Wenn etwas
        fehlt, melde dich bitte beim Büro.
      </DialogContentText>
      <DialogContentText>
        <b>Training bearbeiten</b> Um ein Training zu bearbeiten oder zu
        löschen, klicke auf den Stift rechts von dem dazugehörigen Eintrag.
        Kurse, die schon freigegeben oder überwiesen worden sind, können nicht
        mehr bearbeitet werden.
      </DialogContentText>
      <DialogContentText>
        <b>Anzeigezeitraum verändern</b> Die Daten, die angezeigt werden, werden
        im oberen Teil angezeigt. Standardmäßig ist das aktuelle Quartal
        ausgewählt. Wenn du den angezeigten Zeitraum verändern möchtest, klickst
        du einfach auf die Daten, und ein Dialog für die Auswahl öffnet sich.
      </DialogContentText>
      <DialogContentText>
        <b>Freigabeprozess</b> Wenn du das Training speichert, wird es vom Büro
        freigegeben und die zugehörigen Pauschalen am Ende des Quartals
        gesammelt überwiesen. Du siehst den Status deines Trainings beim
        dazugehörigen Eintrag, er ist entweder <em>neu</em>,{' '}
        <em>freigegeben</em> oder <em>überwiesen</em>.
      </DialogContentText>
    </React.Fragment>
  );
}

function ProfileHelpText() {
  return (
    <React.Fragment>
      <DialogContentText>
        Auf dieser Seite siehst du, welche Informationen das Büro für dich
        hinterlegt hat. Wenn z.B. ein Kurs fehlt oder falsch eingetragen ist,
        melde dich bitte beim Büro.
      </DialogContentText>
      <DialogContentText>
        <b>IBAN</b>. Wird verwendet, um die Pauschalen am Ende des Quartals zu
        überweisen. Das ist einzigen Wert, den du selbst ändern kannst. Dafür
        klickst du auf den Stift-Knopf rechts neben deiner IBAN.
      </DialogContentText>
      <DialogContentText>
        <b>Pauschalen-Gruppe</b> bezeichnet die für dich freigegebenen
        Pauschalen. Das hängt hauptsächlich davon ab ob du eine Qualifikation
        hast oder nicht. Zusätzlich gibt es eine weitere Pauschale für
        Liga-Spiele.
      </DialogContentText>
      <DialogContentText>
        <b>Logout</b> Wenn du möchtest, kannst du dich ausloggen, aber das
        sollte normalerweise nicht notwendig sein. Aktuell gibt es beim
        Ausloggen noch einen Fehler. Du wirst nur aus der App nicht aus cognito
        ausgeloggt. Cognito ist der externe Dienst, der die Anmeldedaten
        verwaltet.
      </DialogContentText>
    </React.Fragment>
  );
}

function ApprovalHelpText() {
  return (
    <React.Fragment>
      <DialogContentText>
        Auf dieser Seite kannst du Trainings freigeben, die von den
        Übungsleitungen eingegeben worden sind.
      </DialogContentText>
      <DialogContentText>
        Über die Datums-Eingabe "<b>Start</b>" und <b>"Ende</b>" kannst du die
        Trainings einschränken, die angezeigt werden. Es gibt Knöpfe für das
        aktuelle und das letzte Quartal, die das Datum automatisch auf den
        jeweiligen Zeitraum setzen.
      </DialogContentText>
      <DialogContentText>
        Über das Eingabefeld "<b>Übungsleitung</b>" kannst du auswählen, welche
        Übungsleitung angezeigt wird. Du kannst entweder "Alle ÜL" auswählen,
        dann siehst du alle ÜL, die in dem Zeitraum ein Training eingegeben
        haben. Oder du kannst "Nur ÜL mit neuen" auswählen. Dann siehst du nur
        ÜL, die in dem Zeitraum ein Training haben, das noch nicht freigegeben
        worden ist.
      </DialogContentText>
      <DialogContentText>
        Wenn ein <b>gelbes Ausrufezeichen</b> <WarningAmberIcon /> erscheint,
        gibt es eine Warnung zu dem Datum. Du kannst Details sehen, wenn du dem
        Mauszeiger über das Ausrufezeichen bewegst.
      </DialogContentText>
      <DialogContentText>
        Ganz Rechts sind kleine Symbole, die es dir ermöglichen, ein Training{' '}
        <b>freizugeben</b> oder die Freigabe rückgängig zu machen.
      </DialogContentText>
      <DialogContentText>
        Wenn du ein Training löschen möchtest, wähle es aus und klicke dann auf
        den "<b>Löschen</b>"-Knopf. Nur neue Trainings können gelöscht werden.
        Bei freigegebenen ist das nicht möglich.
      </DialogContentText>
    </React.Fragment>
  );
}

function ReportHelpText() {
  return (
    <>
      <DialogContentText>
        Auf dieser Seite siehst du eine Übersicht der Trainings, die du gegeben
        hast, und die vom Janus entschädigt worden sind.
      </DialogContentText>
      <DialogContentText>
        Wenn du auf die blaue Datumsangabe klickst, kannst du den Zeitraum
        einschränken für den Daten angezeigt werden.
      </DialogContentText>
      <DialogContentText>
        Wenn du auf den Export-Knopf klickst, wird dir ein Pdf-Export der Daten
        erstellt. Der Export braucht einen kurzen Moment, um generiert zu
        werden. Bitte geduldige dich etwas, nachdem du darauf geklickt hast
      </DialogContentText>
      <DialogContentText>
        Achtung: Der Export ist nur aktiv, wenn ein komplettes Jahr ausgewählt
        ist.
      </DialogContentText>
    </>
  );
}

function dialogContents(pathname: string) {
  const pathnameWithoutQuery = pathname.split('?').pop();
  switch (pathnameWithoutQuery) {
    case '/':
      return (
        <DialogContentText>
          Wenn du auf den ? Knopf drückst, bekommst du Hilfe für die aktuelle
          Funktionalität angezeigt.
        </DialogContentText>
      );
    case '/enter':
      return <EnterHelpText />;
    case '/profile':
      return <ProfileHelpText />;
    case '/approve':
      return <ApprovalHelpText />;
    case '/report':
      return <ReportHelpText />;
    default:
      return (
        <DialogContentText>Leider keine Hilfe verfügbar</DialogContentText>
      );
  }
}

function HelpDialog(props: {
  open: boolean;
  onClose: () => void;
  pathname: string;
}) {
  return (
    <Dialog open={props.open} onClose={props.onClose}>
      <DialogTitle>Hilfe</DialogTitle>
      <DialogContent>{dialogContents(props.pathname)}</DialogContent>
      <DialogActions>
        <Button onClick={props.onClose}>Schließen</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function HelpButton() {
  const pathname = usePathname();

  const [showHelp, setShowHelp] = React.useState<boolean>(false);

  return (
    <React.Fragment>
      <IconButton color={'inherit'} onClick={() => setShowHelp(true)}>
        <HelpIcon />
      </IconButton>
      <HelpDialog
        open={showHelp}
        onClose={() => setShowHelp(false)}
        pathname={pathname}
      />
    </React.Fragment>
  );
}
