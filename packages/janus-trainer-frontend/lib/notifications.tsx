import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { closeSnackbar, enqueueSnackbar } from 'notistack';

export function showError(
  message: string,
  backendMessage: string | null = null,
) {
  let finalMessage;
  if (backendMessage) {
    finalMessage = `${message} / Systemmeldung: ${backendMessage}`;
  } else {
    finalMessage = message;
  }
  enqueueSnackbar(finalMessage, {
    persist: true,
    variant: 'error',
    action: (snackbarId) => (
      <Button
        onClick={() => {
          closeSnackbar(snackbarId);
        }}
      >
        <Typography>Ok</Typography>
      </Button>
    ),
  });
}

export function showSuccess(message: string) {
  enqueueSnackbar(message, { variant: 'success', autoHideDuration: 3000 });
}
