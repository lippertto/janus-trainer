import { expect, test } from '@playwright/test';
import { newBrowser } from './browser';


test.describe.serial('Enter page', () => {
  test.use({ storageState: 'playwright/.auth/trainer.json' });

  test('enter a new training', async () => {
    const browser = await newBrowser();
    const page = await browser.newPage();

    const participantCount = Math.ceil(Math.random() * 999);

    await page.goto('/enter');

    // create a new training
    await page.getByTestId("enter-training-button").click()
    await expect(page.getByText("Training hinzufügen")).toBeVisible();

    await page.getByLabel('Anzahl Personen *').fill(participantCount.toString());

    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText("Training hinzufügen")).toBeHidden();

    // Check that training has been created
    await expect(page.getByText(`${participantCount} Personen`)).toBeVisible();

    // update (a) training
    const newCount = participantCount-1
    await page.getByRole('list').getByRole('button').last().click();
    await expect(page.getByText("Training bearbeiten")).toBeVisible();
    await page.getByLabel('Anzahl Personen *').fill(newCount.toString());
    await page.getByRole('button', { name: 'Speichern' }).click()
    await expect(page.getByText("Training bearbeiten")).toBeHidden();

    // Check that the training has been updated
    await expect(page.getByText(`${newCount} Personen`)).toBeVisible();

    // Delete the training
    const trainingCountBefore= await page.locator("li").count()
    await page.getByRole('list').getByRole('button').last().click();
    await expect(page.getByText("Training bearbeiten")).toBeVisible();
    await page.getByRole('button', { name: 'löschen' }).click()
    await page.getByRole('button', { name: 'Ok' }).click();

    await expect(page.locator("li")).toHaveCount(trainingCountBefore - 1);

    await page.close();
    await browser.close();
  });


});
