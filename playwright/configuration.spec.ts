import { test, expect, firefox } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';

test.beforeEach('clear database', async ({ page }) => {
  await page.goto('/configure');
  await page.getByTestId('configure-button-clear-database').click();
});

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


test.describe.serial('Configuration page', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('enter a new holiday', async () => {
    const browser = await newBrowser()
    const page = await browser.newPage();

    await page.goto('/configure');
    await page.getByTestId('add-holiday-button').click();

    await page.locator('#holiday-date-picker-start').fill('03.10.2024');
    await page.locator('#holiday-date-picker-end').fill('03.10.2024');
    await page
      .getByTestId('holiday-text-field-description')
      .getByLabel('Beschreibung')
      .fill('Tag der dt. Einheit');

    await page.getByTestId('holiday-button-submit').click();

    await expect(page.getByText('Tag der dt. Einheit')).toBeVisible();

    await browser.close();
  });

  test('enter a new discipline', async () => {
    const disciplineName = uuidv4();

    const browser = await newBrowser();
    const page = await browser.newPage();

    await page.goto('/configure');
    await page.getByTestId('add-discipline-button').click();
    await page.getByTestId('enter-discipline-textfield').fill(disciplineName);
    await page.getByTestId('enter-discipline-confirm-button').click();

    await expect(page.getByText(disciplineName, {exact: true})).toBeVisible();

    await browser.close();

  });
});
