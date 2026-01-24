import { expect, test, Browser, Page, Locator } from '@playwright/test';
import { newBrowser } from './browser';
import { fillOutDatePicker } from '@/playwright/playwrightTestHelpers';
import dayjs from 'dayjs';

/**
 * Helper function to set a trainer's IBAN on the profile page
 */
async function setTrainerIban(page: Page, iban: string) {
  await page.goto('/profile');
  await page.getByLabel('edit-iban').click();
  const ibanField = page.getByRole('textbox', { name: 'IBAN' });
  await ibanField.clear();
  await ibanField.fill(iban);
  await page.getByRole('button', { name: /ok/i }).click();
}

/**
 * Helper function to extract IBAN from a table row
 */
async function extractIbanFromRow(row: Locator): Promise<string> {
  const rowText = await row.textContent();
  const ibanMatch = rowText?.match(/DE[\d\s]{20,}/);
  expect(ibanMatch).toHaveLength(1);
  return ibanMatch![0].replace(/\s/g, '');
}

/**
 * E2E test for Historical IBAN Capture feature
 *
 * This test verifies that when a payment is created, the system captures
 * the trainer's IBAN at that moment in time. Even if the trainer later
 * updates their IBAN, the payment should still reference the original IBAN.
 *
 * Test flow:
 * 1. Trainer enters a training session
 * 2. Admin approves the training
 * 3. Admin creates a payment (capturing the current IBAN)
 * 4. Trainer changes their IBAN to a new value
 * 5. Admin views the payment compensation details
 * 6. Verify that the ORIGINAL IBAN is displayed (not the new one)
 */
test.describe.serial('Historical IBAN Capture', () => {
  const participantCount = Math.ceil(Math.random() * 999);
  const trainingDate = dayjs().subtract(1, 'day');
  const originalIban = 'DE29500105177855554955';
  const newIban = 'DE89370400440532013000';

  test('trainer enters a training session', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/trainer.json',
    });
    const page = await context.newPage();

    await setTrainerIban(page, originalIban);

    await page.goto('/enter');

    // Create a new training
    await page.getByTestId('enter-training-button').click();
    await expect(page.getByText('Vergütung beantragen')).toBeVisible();

    await page
      .getByLabel(/.*Anzahl Personen.*/i)
      .fill(participantCount.toString());

    await fillOutDatePicker(page, 'Datum', trainingDate);

    await page.getByRole('button', { name: 'Speichern' }).click();
    await expect(page.getByText('Vergütung beantragen')).toBeHidden();

    // Verify the training was created
    await expect(page.getByText(`${participantCount} Personen`)).toBeVisible();

    await context.close();
  });

  test('admin approves the training', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
    });
    const page = await context.newPage();

    await page.goto('/approve');

    // Select the trainer first (required before grid appears)
    await page.getByRole('button', { name: /^Test-User Trainer/i }).click();

    // Click on 'freigeben' menuitem
    await page.getByRole('menuitem', { name: /freigeben/i }).click();

    // Wait for approval to complete
    await expect(
      page.getByRole('gridcell', { name: /freigegeben/i }),
    ).toBeVisible();

    await context.close();
  });

  test('admin verifies trainer IBAN and creates payment', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
    });
    const page = await context.newPage();

    await page.goto('/compensate');

    // Find the trainer row by name (Test-User Trainer)
    const trainerRow = page
      .getByRole('row')
      .filter({ hasText: 'Test-User Trainer' });

    const strippedIban = await extractIbanFromRow(trainerRow);
    expect(strippedIban).toBe(originalIban);

    await page
      .getByRole('button', { name: /Alle als überwiesen markieren/i })
      .click();

    await context.close();
  });

  test('trainer changes their IBAN to new value', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/trainer.json',
    });
    const page = await context.newPage();

    await setTrainerIban(page, newIban);

    await context.close();
  });

  test('admin views payment and verifies original IBAN is preserved', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/admin.json',
    });
    const page = await context.newPage();

    await page.goto('/compensate');

    // Click on the second ListItemButton (1st button is hamburger, then help)
    await page.getByRole('button').nth(4).click();

    // Find the trainer row by name (Test-User Trainer)
    const trainerRow = page
      .getByRole('row')
      .filter({ hasText: 'Test-User Trainer' });

    const displayedIban = await extractIbanFromRow(trainerRow);
    expect(displayedIban).toBe(originalIban);

    await context.close();
  });

  test('cleanup: trainer restores original IBAN', async ({ browser }) => {
    const context = await browser.newContext({
      storageState: 'playwright/.auth/trainer.json',
    });
    const page = await context.newPage();

    await setTrainerIban(page, originalIban);

    await context.close();
  });
});
