import { test, expect } from '@playwright/test';

test.beforeEach('clear database', async ({ page }) => {
  await page.goto('/configure');
  await page.getByTestId('configure-button-clear-database').click();
});

test.describe('Configuration page', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('enter a new holiday', async ({ page }) => {
    await page.goto('/configure');
    await page.getByTestId('add-holiday-button').click();

    // await page.locator('#holiday-date-picker-start').click();
    await page.locator('#holiday-date-picker-start').fill('03.10.2024');
    // await page.evaluate(() => {
    //   const selector = document.querySelector('#holiday-date-picker-start');
    //   selector.setAttribute('readonly', undefined);
    // });
    // await page.getByRole('textbox', { name: 'Start' }).fill('03.10.2024');
    // await page.locator('#holiday-date-picker-end').focus;
    // await page.evaluate(() => {
    //   const selector = document.querySelector('#holiday-date-picker-end');
    //   selector.setAttribute('readonly', 'false');
    // });

    await page.locator('#holiday-date-picker-end').fill('03.10.2024');

    // the testIds do not work on CI. Also, the getByRole does not work on CI.
    await page.getByTestId('holiday-text-field-description').click();
    await page
      .getByTestId('holiday-text-field-description')
      .getByLabel('Beschreibung')
      .fill('Tag der Dt. Einheit');

    await page.getByTestId('holiday-button-submit').click();

    await expect(page.getByText('Tag der dt. Einheit')).toBeVisible();
  });
});
