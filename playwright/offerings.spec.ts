import { expect, test } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import { newBrowser } from './browser';

test.describe.serial('Offerings page', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  test('cost-center cannot be deleted when referenced by a course', async () => {
    test.setTimeout(120_000);

    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const costCenterName = `test-cc-${randomSuffix}`;
    const courseName = `test-course-${randomSuffix}`;
    const randomNumber = Math.ceil(Math.random() * 999).toString();

    const browser = await newBrowser();
    const page = await browser.newPage();

    // create cost center
    await page.goto('/offerings/cost-centers');
    await page.getByRole('button', { name: /Hinzufügen/i }).click();
    await page.getByLabel('Name').fill(costCenterName);
    await page.getByLabel('Nummer').fill(randomNumber);
    await page.getByRole('button', { name: /Speichern/i }).click();
    await page.getByRole('alert').click();

    // create course with cost center
    await page.goto('/offerings/courses');
    await page.getByRole('button', { name: /Hinzufügen/i }).click();
    await page
      .getByRole('textbox', { name: 'Name des Kurses' })
      .fill(courseName);
    await page.getByLabel('Kostenstelle').fill(costCenterName);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await page.getByRole('button', { name: /Speichern/i }).click();
    await page.getByRole('alert').click();

    // delete cost center
    await page.goto('/offerings/cost-centers');
    await page.getByRole('gridcell', { name: costCenterName }).click();
    await page.getByRole('button', { name: /löschen/i }).click();
    await page.getByRole('button', { name: 'Ok' }).click(); // confirm deletion
    await page.getByRole('alert').click();
    await page.getByRole('button', { name: 'Ok' }).click(); // dismiss the error message

    // delete the course
    await page.goto('/offerings/courses');
    await page.getByRole('gridcell', { name: courseName }).click();
    await page.getByRole('button', { name: /löschen/i }).click();
    await page.getByRole('button', { name: 'Ok' }).click(); // confirm deletion
    await page.getByRole('alert').click();

    // try again to delete the cost center
    await page.goto('/offerings/cost-centers');
    await page.getByRole('gridcell', { name: costCenterName }).click();
    await page.getByRole('button', { name: /löschen/i }).click();
    await page.getByRole('button', { name: 'Ok' }).click(); // confirm deletion
    await page.getByRole('alert').click();

    await page.close();
    await browser.close();
  });
});
