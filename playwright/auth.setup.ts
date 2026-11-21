import { test as setup, expect, Page } from '@playwright/test';

// implemented after https://playwright.dev/docs/auth#multiple-signed-in-roles
// The tests sign in through the app's own /login page (which talks to Cognito from the server)
// and write the authentication information to a file which can be used by the following tests.
//
// TODO: This used to work only with firefox because of the cross-origin redirect to the Cognito
// Hosted UI. Sign-in is now same-origin, so chromium may work as well. That has not been verified
// against a real Cognito pool yet, so the chromium project in playwright.config.ts stays disabled.

const adminFile = 'playwright/.auth/admin.json';
const trainerFile = 'playwright/.auth/trainer.json';

async function signInOnLoginPage(
  page: Page,
  username: string,
  password: string,
) {
  await page.getByTestId('login-email').fill(username);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}

setup.describe.serial('Log in with accounts for test users', () => {
  setup('authenticate as admin', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('login-button').click();
    await page.waitForURL(/\/login/);
    await signInOnLoginPage(
      page,
      process.env.COGNITO_ADMIN_USERNAME!,
      process.env.COGNITO_ADMIN_PASSWORD!,
    );

    await page.waitForURL('/');
    await expect(page.getByText('Kurzanleitung')).toBeVisible();
    await page.context().storageState({ path: adminFile });
  });

  setup('authenticate as user', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('login-button').click();
    await page.waitForURL(/\/login/);
    await signInOnLoginPage(
      page,
      process.env.COGNITO_TRAINER_USERNAME!,
      process.env.COGNITO_TRAINER_PASSWORD!,
    );

    await page.waitForURL('/');
    await expect(page.getByText('Kurzanleitung')).toBeVisible();
    await page.context().storageState({ path: trainerFile });
  });

  // Does not write a storage state: it only checks the return-to-page behavior (FR-011).
  setup('returns to the protected page after sign-in', async ({ page }) => {
    await page.goto('/profile');
    await page.getByTestId('login-button').click();
    await page.waitForURL(/\/login\?callbackUrl=%2Fprofile/);
    await signInOnLoginPage(
      page,
      process.env.COGNITO_TRAINER_USERNAME!,
      process.env.COGNITO_TRAINER_PASSWORD!,
    );

    await page.waitForURL('/profile');
    await expect(page).toHaveURL(/\/profile$/);
  });

  setup('ignores a callbackUrl to another origin', async ({ page }) => {
    await page.goto('/login?callbackUrl=https%3A%2F%2Fevil.example');
    await signInOnLoginPage(
      page,
      process.env.COGNITO_TRAINER_USERNAME!,
      process.env.COGNITO_TRAINER_PASSWORD!,
    );

    await page.waitForURL('/');
    await expect(page).toHaveURL(/^[^?]*\/$/);
    expect(new URL(page.url()).origin).not.toContain('evil.example');
  });
});
