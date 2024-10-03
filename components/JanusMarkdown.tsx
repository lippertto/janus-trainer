import Markdown from 'react-markdown';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import React from 'react';

export function JanusMarkdown(props: { children: string }) {
  return (
    <Markdown
      children={props.children}
      components={{
        h1: ({ children }) => (
          <Typography sx={{ mt: 1 }} variant={'h1'} children={children} />
        ),
        h2: ({ children }) => (
          <Typography sx={{ mt: 1 }} variant={'h2'} children={children} />
        ),
        h3: ({ children }) => (
          <Typography sx={{ mt: 1 }} variant={'h3'} children={children} />
        ),
        h4: ({ children }) => (
          <Typography sx={{ mt: 1 }} variant={'h4'} children={children} />
        ),
        h5: ({ children }) => (
          <Typography sx={{ mt: 1 }} variant={'h5'} children={children} />
        ),
        h6: ({ children }) => (
          <Typography sx={{ mt: 1 }} variant={'h6'} children={children} />
        ),
        p: ({ children }) => <Typography sx={{ mt: 1 }} children={children} />,
        ol: ({ children }) => (
          <List
            sx={{
              listStyleType: 'decimal',
              mt: 2,
              pl: 2,
              '& .MuiListItem-root': {
                display: 'list-item',
              },
            }}
          >
            {children}
          </List>
        ),
        ul: ({ children }) => (
          <List
            sx={{
              listStyleType: 'disc',
              mt: 2,
              pl: 2,
              '& .MuiListItem-root': {
                display: 'list-item',
              },
            }}
          >
            {children}
          </List>
        ),
        li: ({ children, ...props }) => (
          <ListItem sx={{ m: 0, p: 0, ml: 2 }} disableGutters>
            <ListItemText sx={{ pl: 0.25 }}>{children}</ListItemText>
          </ListItem>
        ),
      }}
    />
  );
}
