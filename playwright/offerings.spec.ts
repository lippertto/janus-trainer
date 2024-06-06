import { expect, test } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import { newBrowser } from './browser';


test.describe.serial('Offerings page', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('enter a new discipline', async () => {
    const disciplineName = `TestSportart-${uuidv4().substring(0,4)}`;

    const browser = await newBrowser();
    const page = await browser.newPage();
    await page.goto('/offerings');

    await page.getByTestId('add-discipline-button').click();
    await page.getByTestId('enter-discipline-textfield').fill(disciplineName);
    await page.getByTestId('enter-discipline-confirm-button').click();
    await expect(page.getByText(disciplineName, { exact: true })).toBeVisible();

    // delete created discipline
    await page.getByRole('button', { name: disciplineName }).click();``
    await page.getByTestId('discipline-delete-button').click();
    await page.getByRole('button', { name: 'Ok' }).click();
    await expect(page.getByText(disciplineName, { exact: true })).toBeHidden();

    await browser.close();

  });

});