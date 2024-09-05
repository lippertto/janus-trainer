import { expect, test } from '@playwright/test';
import { newBrowser } from './browser';

test.describe.serial('user management', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('enter a new user', async () => {
    const browser = await newBrowser();
    const page = await browser.newPage();

    await page.goto('/users');
    await expect(page.getByText('spamtl')).toBeHidden();

    await page.getByTestId('add-user-button').click();
    await page.getByTestId('enter-name-textfield').fill('Playwright Test User');
    await page.getByTestId('enter-email-textfield').fill('spamtl@fastmail.fm');
    await page.getByTestId('is-admin-checkbox').click();

    await page.getByTestId('is-trainer-checkbox').click();
    await page.getByLabel('IBAN').fill('DE72500105176125958433');

    await page.getByTestId('save-user-button').click();
    await expect(
      page.getByText('Playwright Test User', { exact: true }),
    ).toBeVisible();

    await page.getByRole('gridcell', { name: 'spamtl@fastmail.fm' }).click();
    await page.getByTestId('delete-user-button').click();

    await page.getByRole('button', { name: 'Ok' }).click();
    await expect(
      page.getByText('Playwright Test User', { exact: true }),
    ).toBeHidden();

    await page.close();
    await browser.close();
  });
});
