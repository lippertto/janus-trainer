import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccordionDetails from '@mui/material/AccordionDetails';
import Stack from '@mui/system/Stack';
import Typography from '@mui/material/Typography';
import React from 'react';
import Box from '@mui/system/Box';

export function Instructions() {
  return (
    <Stack>
      <Box sx={{ p: 1 }}>
        <Typography variant="h6">Kurzanleitung</Typography>
      </Box>
      <Accordion defaultExpanded={true}>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="navigation-content"
          id="navigation-header"
        >
          <Typography>Navigation</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            Du kannst zwischen den Seiten navigieren, indem du auf die drei
            Striche oben links klickst.
          </Typography>
          <Typography>
            Um Informationen zu den einzelnen Funktionalitäten zu bekommen,
            klicke auf die unten stehenden Überschriften.
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="enter-content"
          id="enter-header"
        >
          <Typography>Eingeben</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            Auf dieser Seite kannst du deine Trainings eintragen und ansehen.
          </Typography>
          <Typography>
            Um ein neues Training einzutragen, klickst du auf das Plus-Symbol
            unten rechts. Du kannst dann alle benötigten Informationen
            eintragen. Die Kurse, auf die du buchen darfst siehst du unter
            "Profil".
          </Typography>
          <Typography>
            Die Trainings werden regelmäßig von Ingrid geprüft und freigegeben.
            Am Ende jedes Monats findet ein Rechnungslauf statt, zu dem das Geld
            für alle freigegebenen Trainings überwiesen wird.
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="report-content"
          id="report-header"
        >
          <Typography>Statistik</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            Auf dieser Seite siehst du eine Übersicht über die Trainings, die du
            gegeben hast.
          </Typography>
          <Typography>
            Falls du für deine Unterlagen ein Dokument mit den gegebenen
            Trainings benötigst, kannst du hier ein pdf exportieren. Für das
            Finanzamt benötigst du das Dokument in der Regel nicht.
          </Typography>
          <Typography>
            Achtung: Du darfst pro Kalenderjahr nur 3.000€ steuerfrei bekommen.
            Außerdem darf jeder Kurs nur max. 44 Mal im Jahr stattfinden.
          </Typography>
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          aria-controls="profile-content"
          id="profile-header"
        >
          <Typography>Profil</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography>
            Auf dieser Seite siehst du die Informationen, die für dich
            hinterlegt worden sind.
          </Typography>
          <Typography>
            Zum Beispiel siehst du hier die Kurse, auf die du buchen darfst.
            Schreib mir gerne, wenn du eine Änderung benötigst:{' '}
            <a href="mailto:tobias.lippert@fastmail.com">
              tobias.lippert@fastmail.com
            </a>
          </Typography>
          <Typography>
            Außerdem kannst du hier die IBAN eintragen, die für die
            Überweisungen verwendet werden soll.
          </Typography>
        </AccordionDetails>
      </Accordion>
    </Stack>
  );
}
