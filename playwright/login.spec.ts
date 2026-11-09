import { expect, Page, Route, test } from '@playwright/test';

// These tests cover the UI state machine of /login only. The four /api/auth/* routes are stubbed
// with page.route(), because the temporary password of a new user and the password reset code are
// delivered by email, which Playwright cannot read. The real Cognito behavior of these flows is
// verified manually in the test pool (see specs/003-custom-login-page/quickstart.md).
//
// /api/auth/session and /api/auth/csrf are NOT stubbed: they are NextAuth's own routes. The last
// step of a sign-in (signIn('credentials')) is therefore not exercised here; the tests end at the
// point where the page would hand the ticket to NextAuth.

test.use({ storageState: { cookies: [], origins: [] } });

const NEW_PASSWORD = 'N3w-secret-pw!';

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

const challenge = {
  status: 'CHALLENGE',
  challengeName: 'NEW_PASSWORD_REQUIRED',
  session: 'cognito-session',
  challengeUsername: 'uuid-username',
};

/** Fills in the sign-in form and submits it. */
async function submitSignIn(page: Page, email: string, password: string) {
  await page.getByTestId('login-email').fill(email);
  await page.getByTestId('login-password').fill(password);
  await page.getByTestId('login-submit').click();
}

async function submitNewPassword(
  page: Page,
  password: string,
  confirmation: string = password,
) {
  await page.getByTestId('new-password').fill(password);
  await page.getByTestId('new-password-confirm').fill(confirmation);
  await page.getByTestId('new-password-submit').click();
}

test.describe('login page: first login (NEW_PASSWORD_REQUIRED)', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/sign-in', (route) =>
      json(route, 200, challenge),
    );
    await page.goto('/login');
  });

  test('a challenge shows the new-password form, in the app', async ({
    page,
  }) => {
    await submitSignIn(page, 'new@example.com', 'temporary-pw');

    await expect(page.getByTestId('new-password')).toBeVisible();
    await expect(page.getByTestId('new-password-confirm')).toBeVisible();
    await expect(page.getByTestId('login-password')).toBeHidden();
    await expect(page).toHaveURL(/\/login/);
  });

  test('mismatching confirmation shows an inline error and sends nothing', async ({
    page,
  }) => {
    let called = false;
    await page.route(
      '**/api/auth/respond-to-new-password-challenge',
      (route) => {
        called = true;
        return json(route, 200, { status: 'SUCCESS', ticket: 't' });
      },
    );
    await submitSignIn(page, 'new@example.com', 'temporary-pw');
    await submitNewPassword(page, NEW_PASSWORD, 'something-else');

    await expect(
      page.getByText('Die Passwörter stimmen nicht überein.'),
    ).toBeVisible();
    expect(called).toBe(false);
  });

  test('a password rejected by Cognito shows an inline error and allows a retry', async ({
    page,
  }) => {
    const sessions: string[] = [];
    await page.route(
      '**/api/auth/respond-to-new-password-challenge',
      (route) => {
        sessions.push(route.request().postDataJSON().session);
        if (sessions.length === 1) {
          return json(route, 400, {
            error: {
              code: 'InvalidPassword',
              message:
                'Das Passwort erfüllt die Anforderungen nicht. too short',
            },
          });
        }
        return json(route, 200, { status: 'SUCCESS', ticket: 'ticket' });
      },
    );
    await submitSignIn(page, 'new@example.com', 'temporary-pw');
    await submitNewPassword(page, 'short');

    await expect(page.getByTestId('new-password-error')).toContainText(
      'too short',
    );
    await expect(page.getByTestId('new-password')).toBeVisible();

    await page.getByTestId('new-password').fill(NEW_PASSWORD);
    await page.getByTestId('new-password-confirm').fill(NEW_PASSWORD);
    await page.getByTestId('new-password-submit').click();

    await expect.poll(() => sessions.length).toBe(2);
    // the retry reuses the same Cognito session
    expect(sessions[1]).toBe(sessions[0]);
  });

  test('the request carries challengeUsername and session, and the ticket is never shown', async ({
    page,
  }) => {
    let body: Record<string, string> | undefined;
    await page.route(
      '**/api/auth/respond-to-new-password-challenge',
      (route) => {
        body = route.request().postDataJSON();
        return json(route, 200, { status: 'SUCCESS', ticket: 'secret-ticket' });
      },
    );
    await submitSignIn(page, 'new@example.com', 'temporary-pw');
    await submitNewPassword(page, NEW_PASSWORD);

    await expect.poll(() => body).toBeDefined();
    expect(body).toEqual({
      email: 'new@example.com',
      challengeUsername: 'uuid-username',
      newPassword: NEW_PASSWORD,
      session: 'cognito-session',
    });
    await expect(page.getByText('secret-ticket')).toBeHidden();
  });

  test('an expired Cognito session returns to sign-in with a message and the email kept', async ({
    page,
  }) => {
    await page.route('**/api/auth/respond-to-new-password-challenge', (route) =>
      json(route, 401, {
        error: {
          code: 'Unauthorized',
          message: 'Die Sitzung ist abgelaufen. Bitte melde dich erneut an.',
        },
      }),
    );
    await submitSignIn(page, 'new@example.com', 'temporary-pw');
    await submitNewPassword(page, NEW_PASSWORD);

    await expect(page.getByTestId('login-notice')).toContainText(
      'Die Sitzung ist abgelaufen',
    );
    await expect(page.getByTestId('login-email')).toHaveValue(
      'new@example.com',
    );
    await expect(page.getByTestId('new-password')).toBeHidden();
  });
});

test.describe('login page: sign-in errors', () => {
  test('wrong credentials show an inline error and keep the email', async ({
    page,
  }) => {
    await page.route('**/api/auth/sign-in', (route) =>
      json(route, 401, {
        error: {
          code: 'Unauthorized',
          message: 'E-Mail oder Passwort ist falsch.',
        },
      }),
    );
    await page.goto('/login');
    await submitSignIn(page, 'someone@example.com', 'wrong');

    await expect(page.getByTestId('login-error')).toContainText(
      'E-Mail oder Passwort ist falsch.',
    );
    await expect(page.getByTestId('login-email')).toHaveValue(
      'someone@example.com',
    );
    await expect(page).toHaveURL(/\/login/);
  });

  test('the app bar is not shown on the login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByTestId('login-page')).toBeVisible();
    await expect(page.getByLabel('menu')).toBeHidden();
  });
});

test.describe('login page: forgot password', () => {
  const CODE = '918273';
  const SENT_TOAST =
    'Falls ein Konto mit dieser E-Mail existiert, wurde ein Code gesendet.';

  async function requestCode(page: Page, email: string) {
    await page.goto('/login');
    await page.getByTestId('forgot-password-link').click();
    await page.getByTestId('forgot-email').fill(email);
    await page.getByTestId('forgot-submit').click();
    await expect(page.getByTestId('reset-code')).toBeVisible();
  }

  async function submitReset(page: Page, code: string, password: string) {
    await page.getByTestId('reset-code').fill(code);
    await page.getByTestId('reset-new-password').fill(password);
    await page.getByTestId('reset-new-password-confirm').fill(password);
    await page.getByTestId('reset-submit').click();
  }

  test('request, confirm, and back to sign-in with the email kept', async ({
    page,
  }) => {
    await page.route('**/api/auth/forgot-password', (route) =>
      json(route, 200, { status: 'CODE_SENT' }),
    );
    let confirmBody: Record<string, string> | undefined;
    await page.route('**/api/auth/confirm-forgot-password', (route) => {
      confirmBody = route.request().postDataJSON();
      return json(route, 200, { status: 'PASSWORD_RESET' });
    });

    await requestCode(page, 'someone@example.com');
    await expect(page.getByText(SENT_TOAST)).toBeVisible();
    await submitReset(page, CODE, 'N3w-secret-pw!');

    await expect(page.getByTestId('login-password')).toBeVisible();
    await expect(page.getByTestId('login-email')).toHaveValue(
      'someone@example.com',
    );
    expect(confirmBody).toEqual({
      email: 'someone@example.com',
      confirmationCode: CODE,
      newPassword: 'N3w-secret-pw!',
    });
    // the user is not signed in by a reset
    await expect(page).toHaveURL(/\/login/);
  });

  test('an email without an account shows the identical confirmation', async ({
    page,
  }) => {
    // the server answers CODE_SENT for every email, so the page cannot differ
    await page.route('**/api/auth/forgot-password', (route) =>
      json(route, 200, { status: 'CODE_SENT' }),
    );
    await requestCode(page, 'nobody@example.com');
    await expect(page.getByText(SENT_TOAST)).toBeVisible();
  });

  test('a wrong code shows an inline error and allows a retry', async ({
    page,
  }) => {
    await page.route('**/api/auth/forgot-password', (route) =>
      json(route, 200, { status: 'CODE_SENT' }),
    );
    let attempts = 0;
    await page.route('**/api/auth/confirm-forgot-password', (route) => {
      attempts += 1;
      if (attempts === 1) {
        return json(route, 400, {
          error: { code: 'CodeMismatch', message: 'Der Code ist falsch.' },
        });
      }
      return json(route, 200, { status: 'PASSWORD_RESET' });
    });

    await requestCode(page, 'someone@example.com');
    await submitReset(page, '000000', 'N3w-secret-pw!');
    await expect(page.getByTestId('reset-error')).toContainText(
      'Der Code ist falsch.',
    );

    await submitReset(page, CODE, 'N3w-secret-pw!');
    await expect(page.getByTestId('login-password')).toBeVisible();
    expect(attempts).toBe(2);
  });

  test('an expired code offers a new one', async ({ page }) => {
    let codeRequests = 0;
    await page.route('**/api/auth/forgot-password', (route) => {
      codeRequests += 1;
      return json(route, 200, { status: 'CODE_SENT' });
    });
    await page.route('**/api/auth/confirm-forgot-password', (route) =>
      json(route, 400, {
        error: {
          code: 'CodeExpired',
          message: 'Der Code ist abgelaufen, bitte fordere einen neuen an.',
        },
      }),
    );

    await requestCode(page, 'someone@example.com');
    await submitReset(page, CODE, 'N3w-secret-pw!');
    await expect(page.getByTestId('reset-error')).toContainText('abgelaufen');

    await page.getByTestId('reset-new-code').click();
    await expect.poll(() => codeRequests).toBe(2);
    await expect(page.getByTestId('reset-error')).toBeHidden();
    await expect(page.getByTestId('reset-code')).toHaveValue('');
  });

  test('a password rejected by Cognito shows an inline error', async ({
    page,
  }) => {
    await page.route('**/api/auth/forgot-password', (route) =>
      json(route, 200, { status: 'CODE_SENT' }),
    );
    await page.route('**/api/auth/confirm-forgot-password', (route) =>
      json(route, 400, {
        error: {
          code: 'InvalidPassword',
          message: 'Das Passwort erfüllt die Anforderungen nicht. too short',
        },
      }),
    );
    await requestCode(page, 'someone@example.com');
    await submitReset(page, CODE, 'short');
    await expect(page.getByTestId('reset-error')).toContainText('too short');
    await expect(page.getByTestId('reset-submit')).toBeEnabled();
  });
});
