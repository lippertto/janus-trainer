import { expect, test } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import { newBrowser } from './browser';


test.describe.serial('Configuration page', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('enter a new holiday', async () => {
    const holidayName = `TestFeiertag-${uuidv4().substring(0, 4)}`;
    const browser = await newBrowser();
    const page = await browser.newPage();

    await page.goto('/configure');
    await expect(page.getByText(holidayName)).toBeHidden();

    // add a new holiday
    await page.getByTestId('add-holiday-button').click();
    await page.locator('#holiday-date-picker-start').fill('03.10.2024');
    await page.locator('#holiday-date-picker-end').fill('03.10.2024');
    await page
      .getByTestId('holiday-text-field-description')
      .getByLabel('Beschreibung')
      .fill(holidayName);
    await page.getByTestId('holiday-button-submit').click();
    await expect(page.getByText(holidayName)).toBeVisible();

    // delete holiday and check that it is not there
    await page.getByTestId(`delete-holiday-${holidayName}`).click();
    await page.getByRole('button', { name: 'Ok' }).click();
    await expect(page.getByText(holidayName, {exact: true})).toBeHidden();

    await browser.close();
  });


});
