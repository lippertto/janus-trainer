import { expect, firefox, test } from '@playwright/test';

/** Obtain the browser instance.
 * We need to configure firefox with having pointer capabilities because MUI will not allow the text fields to be editable
 * in the default scenario on the server.
 * https://github.com/mui/mui-x/pull/5684
 */
async function newBrowser() {
  return await firefox.launch({
    firefoxUserPrefs: {
      'ui.primaryPointerCapabilities': 0x02 | 0x04,
      'ui.allPointerCapabilities': 0x02 | 0x04,
    },
  });
}

test.describe.serial('user management', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('enter a new user', async () => {
    const browser = await newBrowser()
    const page = await browser.newPage();

    await page.goto('/manage-users');
    await expect(page.getByText('spamtl')).toBeHidden();

    await page.getByTestId('add-user-button').click();
    await page.getByTestId('enter-name-textfield').fill('Playwright Test User')
    await page.getByTestId('enter-email-textfield').fill('spamtl@fastmail.fm')
    await page.getByTestId('is-admin-checkbox').click();

    await expect(page.getByTestId('enter-iban-textfield')).toBeDisabled();
    await page.getByTestId('is-trainer-checkbox').click();
    await expect(page.getByTestId('enter-iban-textfield')).toBeEnabled();
    await page.getByTestId('enter-iban-textfield').fill('DE72500105176125958433')

    await page.getByTestId('save-user-button').click()
    await expect(page.getByText('spamtl')).toBeVisible();

    await page.getByTestId('delete-user-spamtl@fastmail.fm-button').click();

    await page.getByRole('button', { name: 'Ok' }).click();
    await expect(page.getByText('spamtl')).toBeHidden();

    await page.close();
    await browser.close();
  });
});