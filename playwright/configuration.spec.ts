import { expect, test } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import { newBrowser } from './browser';
import { fillOutDatePicker } from '@/playwright/playwrightTestHelpers';
import dayjs from 'dayjs';

test.describe.serial('Configuration page', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('enter a new holiday', async () => {
    const holidayName = `TestFeiertag-${uuidv4().substring(0, 4)}`;
    const browser = await newBrowser();
    const page = await browser.newPage();

    await page.goto('/configure/holidays');
    await expect(page.getByText(holidayName)).toBeHidden();
    // set the displayed year to the one of the holiday
    const yearInput = page
      .getByRole('group', { name: 'Jahr' })
      .getByRole('spinbutton', { name: 'Year' });
    await yearInput.fill('2024');

    await page.getByRole('button', { name: /Hinzufügen/i }).click();

    await fillOutDatePicker(page, 'Start', dayjs('2024-10-03'));
    await fillOutDatePicker(page, 'Ende', dayjs('2024-10-03'));
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
