import { test as setup, expect } from '@playwright/test';

const adminFile = 'playwright/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByTestId('profile-button').click();
  await page.getByTestId('login-button').click();
  await page.getByRole('button', { name: 'Sign in with Cognito' }).click();
  await page
    .locator('input[name="username"]:visible')
    .fill(process.env.COGNITO_ADMIN_USERNAME);
  await page
    .locator('input[name="password"]:visible')
    .fill(process.env.COGNITO_ADMIN_PASSWORD);
  await page.locator('input[name="signInSubmitButton"]:visible').click();

  await page.waitForURL('http://localhost:3000/');
  // eslint-disable-next-line playwright/no-standalone-expect
  await expect(page.getByText('eintragen')).toBeVisible();
  await page.context().storageState({ path: adminFile });
});

const trainerFile = 'playwright/.auth/trainer.json';

setup('authenticate as user', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.getByTestId('profile-button').click();
  await page.getByTestId('login-button').click();
  await page.getByRole('button', { name: 'Sign in with Cognito' }).click();
  await page
    .locator('input[name="username"]:visible')
    .fill(process.env.COGNITO_TRAINER_USERNAME);
  await page
    .locator('input[name="password"]:visible')
    .fill(process.env.COGNITO_TRAINER_PASSWORD);
  await page.locator('input[name="signInSubmitButton"]:visible').click();

  await page.waitForURL('http://localhost:3000/');
  // eslint-disable-next-line playwright/no-standalone-expect
  await expect(page.getByText('eintragen')).toBeVisible();
  await page.context().storageState({ path: trainerFile });
});
