import { expect, test } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import { newBrowser } from './browser';

test.describe.serial('Configuration page', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('enter a new holiday', async () => {
    const holidayName = `TestFeiertag-${uuidv4().substring(0, 4)}`;
    const browser = await newBrowser();
    const page = await browser.newPage();

    await page.goto('/configure/holidays');
    await expect(page.getByText(holidayName)).toBeHidden();
    // set the displayed year to the one of the holiday
    await page.getByPlaceholder('YYYY').fill('2024');

    await page.getByRole('button', { name: /Hinzufügen/i }).click();

    await page.getByLabel(/Start.*/i).fill('03.10.2024');

    await page.getByLabel(/Ende.*/i).fill('03.10.2024');

    await page.getByLabel('Beschreibung').fill(holidayName);

    await page.getByRole('button', { name: /Speichern/i }).click();
    await expect(page.getByText(holidayName)).toBeVisible();

    // delete holiday and check that it is not there
    await page.getByText(holidayName).click();
    await page.getByRole('button', { name: 'Löschen' }).click();
    await page.getByRole('button', { name: 'Ok' }).click();
    await expect(page.getByText(holidayName, { exact: true })).toBeHidden();

    await page.close();
    await browser.close();
  });
});
