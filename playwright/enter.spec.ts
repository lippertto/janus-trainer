import { expect, test } from '@playwright/test';
import { v4 as uuidv4 } from 'uuid';
import { newBrowser } from './browser';


test.describe.serial('Enter page', () => {
  test.use({ storageState: 'playwright/.auth/trainer.json' });

  test('enter a new training', async () => {
    const browser = await newBrowser();
    const page = await browser.newPage();

    const participantCount = Math.floor(Math.random() * 9000) + 1000

    await page.goto('/enter');

    // create a new training
    await page.getByTestId("enter-training-button").click()
    await expect(page.getByText("Training hinzufügen")).toBeVisible();

    await expect(page.getByTestId("add-training-save-button")).toBeDisabled();
    await page.getByTestId("add-training-participant-count-field").fill(participantCount.toString());

    await expect(page.getByTestId("add-training-save-button")).toBeEnabled();
    await page.getByTestId("add-training-save-button").click()
    await expect(page.getByText("Training hinzufügen")).toBeHidden();

    // Check that training has been created
    await expect(page.getByText(`${participantCount} Teilnehmer`)).toBeVisible();

    // update (a) training
    const newCount = participantCount-1
    await page.getByRole('list').getByRole('button').last().click();
    await expect(page.getByText("Training bearbeiten")).toBeVisible();
    await page.getByTestId("add-training-participant-count-field").fill(newCount.toString());
    await expect(page.getByTestId("add-training-save-button")).toBeEnabled();
    await page.getByTestId("add-training-save-button").click()
    await expect(page.getByText("Training bearbeiten")).toBeHidden();

    // Check that the training has been updated
    await expect(page.getByText(`${newCount} Teilnehmer`)).toBeVisible();

    // Delete the training
    const trainingCountBefore= await page.locator("li").count()
    await page.getByRole('list').getByRole('button').last().click();
    await expect(page.getByText("Training bearbeiten")).toBeVisible();
    await page.getByTestId("add-training-delete-button").click()
    await page.getByRole('button', { name: 'Ok' }).click();

    await expect(page.locator("li")).toHaveCount(trainingCountBefore - 1);

    await page.close();
    await browser.close();
  });


});
