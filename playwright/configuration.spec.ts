import { test, expect, firefox } from '@playwright/test';

test.beforeEach('clear database', async ({ page }) => {
  await page.goto('/configure');
  await page.getByTestId('configure-button-clear-database').click();
});

test.describe('Configuration page', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('enter a new holiday', async () => {
    // we need to configure firefox with having pointer capabilities because MUI will not allow the text fields to be editable
    // in the default scenario on the server.
    // https://github.com/mui/mui-x/pull/5684
    const browser = await firefox.launch({
      firefoxUserPrefs: {
        'ui.primaryPointerCapabilities': 0x02 | 0x04,
        'ui.allPointerCapabilities': 0x02 | 0x04,
      },
    });
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

    browser.close();
  });
});
