import { firefox } from '@playwright/test';

/** Obtain the browser instance.
 * We need to configure firefox with having pointer capabilities because MUI will not allow the text fields to be editable
 * in the default scenario on the server.
 * https://github.com/mui/mui-x/pull/5684
 */
export async function newBrowser() {
  return await firefox.launch({
    firefoxUserPrefs: {
      'ui.primaryPointerCapabilities': 0x02 | 0x04,
      'ui.allPointerCapabilities': 0x02 | 0x04,
    },
  });
}