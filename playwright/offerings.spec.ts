import { test } from '@playwright/test';
import { newBrowser } from './browser';

test.describe.serial('Offerings page', () => {
  test.use({ storageState: 'playwright/.auth/admin.json' });

  // the test will throw on the getBy* methods. We do not need separate assertions
  // eslint-disable-next-line playwright/expect-expect
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
    await page.getByLabel('Name *').fill(costCenterName);
    await page.getByLabel('Nummer').fill(randomNumber);

    const createCostCenterPromise = page.waitForResponse(
      'http://localhost:3000/api/cost-centers',
    );
    await page.getByRole('button', { name: /Speichern/i }).click();
    await createCostCenterPromise;

    // create course with cost center
    await page.goto('/offerings/courses');
    await page.getByRole('button', { name: /Hinzufügen/i }).click();
    await page
      .getByRole('textbox', { name: 'Name des Kurses' })
      .fill(courseName);
    await page.getByLabel('Kostenstelle *').fill(costCenterName);
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');

    const createCoursePromise = page.waitForResponse((response) =>
      response.url().includes('/api/courses'),
    );
    await page.getByRole('button', { name: /Speichern/i }).click();
    await createCoursePromise;

    // delete cost center (this should fail)
    await page.goto('/offerings/cost-centers');
    await page.getByRole('gridcell', { name: costCenterName }).click();
    await page.getByRole('button', { name: /löschen/i }).click();

    const failedDeleteCostCenterPromise = page.waitForResponse((response) =>
      response.url().includes('/api/cost-centers'),
    );
    await page.getByRole('button', { name: 'Ok' }).click(); // confirm deletion
    await failedDeleteCostCenterPromise;

    // delete the course
    await page.goto('/offerings/courses');
    await page.getByRole('gridcell', { name: courseName }).click();
    await page.getByRole('button', { name: /löschen/i }).click();

    const deleteCoursePromise = page.waitForResponse((response) =>
      response.url().includes('/api/courses'),
    );
    await page.getByRole('button', { name: 'Ok' }).click(); // confirm deletion
    await deleteCoursePromise;

    // I have not found another way to do this
    // eslint-disable-next-line playwright/no-wait-for-selector
    await page.waitForSelector(`[role="gridcell"][name="${courseName}"]`, {
      state: 'detached',
    });

    // try again to delete the cost center
    await page.goto('/offerings/cost-centers');
    await page.getByRole('gridcell', { name: costCenterName }).click();
    await page.getByRole('button', { name: /löschen/i }).click();

    const succeedingDeleteCostCenterPromise = page.waitForResponse((response) =>
      response.url().includes('/api/cost-centers'),
    );
    await page.getByRole('button', { name: 'Ok' }).click(); // confirm deletion
    await succeedingDeleteCostCenterPromise;

    // I have not found another way to do this
    // eslint-disable-next-line playwright/no-wait-for-selector
    await page.waitForSelector(`[role="gridcell"][name="${costCenterName}"]`, {
      state: 'detached',
    });

    await page.close();
    await browser.close();
  });
});
