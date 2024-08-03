import React, { useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Markdown from 'react-markdown';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import FormGroup from '@mui/material/FormGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import DialogActions from '@mui/material/DialogActions';
import { CircularProgress } from '@mui/material';
import Button from '@mui/material/Button';

export function TosDialog(props: { tosData: string, handleAccept: () => void, open: boolean}) {
  const [accepted, setAccepted] = React.useState<boolean>(false);
  const [clicked, setClicked] = React.useState<boolean>(false);

  useEffect(() => {
    setClicked(false);
  }, [props.open])

  return <Dialog open={props.open} fullScreen={true}>
    <DialogTitle>Allgemeine Geschäftsbedingungen</DialogTitle>
    <DialogContent>
      <Box maxHeight={'80%'}>
        <Stack>
          <Markdown children={props.tosData}
                    components={{
                      h1: ({ children }) => (<Typography sx={{ mt: 1 }} variant={'h1'} children={children} />),
                      h2: ({ children }) => (<Typography sx={{ mt: 1 }} variant={'h2'} children={children} />),
                      h3: ({ children }) => (<Typography sx={{ mt: 1 }} variant={'h3'} children={children} />),
                      h4: ({ children }) => (<Typography sx={{ mt: 1 }} variant={'h4'} children={children} />),
                      h5: ({ children }) => (<Typography sx={{ mt: 1 }} variant={'h5'} children={children} />),
                      p: ({ children }) => (<Typography sx={{ mt: 1 }} children={children} />),
                      ol: ({ children }) => (<List sx={{
                        listStyleType: 'decimal',
                        mt: 2,
                        pl: 2,
                        '& .MuiListItem-root': {
                          display: 'list-item',
                        },
                      }}>{children}</List>),
                      ul: ({ children }) => (<List sx={{
                        listStyleType: 'disc',
                        mt: 2,
                        pl: 2,
                        '& .MuiListItem-root': {
                          display: 'list-item',
                        },
                      }}>{children}</List>),
                      li: ({ children, ...props }) => (
                        <ListItem sx={{ m: 0, p: 0, ml: 2 }} disableGutters><ListItemText
                          sx={{ pl: 0.25 }}>{children}</ListItemText></ListItem>),
                    }}
          />
          <FormGroup>
            <FormControlLabel control={<Checkbox checked={accepted} onChange={(e) => {
              setAccepted(e.target.checked);
            }} />} label={'Ich akzeptiere die Nutzungsbedingungen'} />
          </FormGroup>
        </Stack>
      </Box>
    </DialogContent>

    <DialogActions>
      {clicked ? <CircularProgress /> :
        <Button
          disabled={!accepted}
          onClick={() => {
            props.handleAccept();
            setClicked(true);
          }}
        >{accepted ? 'Schließen' : 'Erst akzeptieren'}</Button>
      }
    </DialogActions>
  </Dialog>;
}