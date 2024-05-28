import { test as setup, expect } from '@playwright/test';

// implemented after https://playwright.dev/docs/auth#multiple-signed-in-roles
// the test will log in via cognito and write the authentication information to a file
// which can be used by the following tests.
// Note that this currently works only with firefox and not with chrome.

const adminFile = 'playwright/.auth/admin.json';

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('login-button').click();
  await page.getByRole('button', { name: 'Sign in with Cognito' }).click();
  await page
    .locator('input[name="username"]:visible')
    .fill(process.env.COGNITO_ADMIN_USERNAME!);
  await page
    .locator('input[name="password"]:visible')
    .fill(process.env.COGNITO_ADMIN_PASSWORD!);
  await page.locator('input[name="signInSubmitButton"]:visible').click();

  await page.waitForURL('/');
  // eslint-disable-next-line playwright/no-standalone-expect
  await expect(page.getByText('Willkommen')).toBeVisible();
  await page.context().storageState({ path: adminFile });
});

const trainerFile = 'playwright/.auth/trainer.json';

setup('authenticate as user', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('login-button').click();
  await page.getByRole('button', { name: 'Sign in with Cognito' }).click();
  await page
    .locator('input[name="username"]:visible')
    .fill(process.env.COGNITO_TRAINER_USERNAME!);
  await page
    .locator('input[name="password"]:visible')
    .fill(process.env.COGNITO_TRAINER_PASSWORD!);
  await page.locator('input[name="signInSubmitButton"]:visible').click();

  await page.waitForURL('/');
  // eslint-disable-next-line playwright/no-standalone-expect
  await expect(page.getByText('Willkommen')).toBeVisible();
  await page.context().storageState({ path: trainerFile });
});
