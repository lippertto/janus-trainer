import React from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import DialogActions from '@mui/material/DialogActions';
import { CircularProgress } from '@mui/material';
import Button from '@mui/material/Button';
import { JanusMarkdown } from '@/components/JanusMarkdown';

export function TosDialog(props: {
  tosData: string;
  handleAccept: () => void;
  open: boolean;
  needsToAccept: boolean;
}) {
  const { needsToAccept } = { ...props };
  const [accepted, setAccepted] = React.useState<boolean>(false);
  const [clicked, setClicked] = React.useState<boolean>(false);

  return (
    <Dialog open={props.open} fullWidth maxWidth={'md'}>
      <DialogTitle>Allgemeine Geschäftsbedingungen</DialogTitle>
      <DialogContent>
        <Box maxHeight={'80%'}>
          <Stack>
            <JanusMarkdown children={props.tosData} />
            {needsToAccept ? (
              <FormGroup>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={accepted}
                      onChange={(e) => {
                        setAccepted(e.target.checked);
                      }}
                    />
                  }
                  label={'Ich akzeptiere die Nutzungsbedingungen'}
                />
              </FormGroup>
            ) : null}
          </Stack>
        </Box>
      </DialogContent>

      <DialogActions>
        {clicked ? (
          <CircularProgress />
        ) : (
          <Button
            disabled={needsToAccept && !accepted}
            onClick={() => {
              props.handleAccept();
              if (needsToAccept) {
                setClicked(true);
              }
            }}
          >
            {needsToAccept && !accepted ? 'Erst akzeptieren' : 'Schließen'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
