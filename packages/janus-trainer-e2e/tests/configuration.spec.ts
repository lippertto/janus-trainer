import { test, expect } from '@playwright/test';

test.beforeEach('clear database', async ({ page }) => {
  await page.goto('/configure');
  await page.getByTestId('configure-button-clear-database').click();
});

test.describe('Configuration page', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('log into webpage', async ({ page }) => {
    await page.goto('/configure');
    await page.getByTestId('add-holiday-button').click();

    await page.getByRole('textbox', { name: 'Start' }).click();
    await page.getByRole('textbox', { name: 'Start' }).fill('03.10.2024');
    await page.getByRole('textbox', { name: 'Ende' }).click();
    await page.getByRole('textbox', { name: 'Ende' }).fill('03.10.2024');
    await page
      .getByTestId('holiday-text-field-description')
      .getByLabel('Beschreibung')
      .fill('Tag der Dt. Einheit');
    await page.getByTestId('holiday-button-submit').click();

    await expect(page.getByText('Tag der dt. Einheit')).toBeVisible();
  });
});
