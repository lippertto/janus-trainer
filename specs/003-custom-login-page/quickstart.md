# Quickstart: Verifying the Custom-Branded Login Page

## Prerequisites

- Local Postgres running (`podman-compose up -d` or equivalent, per `README.md`).
- `.env.development.local` populated with existing `COGNITO_CLIENT_ID`, `COGNITO_REGION`,
  `COGNITO_USER_POOL_ID` (already present — no new env vars required).
- The Cognito App Client for the environment you're testing against (dev/test) must have
  `ALLOW_USER_PASSWORD_AUTH` enabled (see `cloudformation.yaml` change in this feature). For local
  development against the shared dev/test Cognito pool, this requires the CloudFormation change to
  have been deployed first (automatic on PR open/update per `.github/workflows/run-on-pull-requests.yaml`).
- `NEXTAUTH_SECRET` set (also used to encrypt the login ticket).
- A Cognito test user with a **confirmed** (non-temporary) password, for exercising the plain
  sign-in path (User Story 1). A second, freshly admin-created user with only a temporary password,
  for exercising the first-login challenge path (User Story 2).

## Manual Verification Steps

### User Story 1 — Everyday sign-in

1. `pnpm start:dev`.
2. Navigate to `/` while signed out. Click "Anmelden".
3. Confirm you land on `/login` (same origin, app-styled), not an external AWS domain.
4. Enter the confirmed test user's email/password. Submit.
5. Confirm you are redirected back into the app, fully authenticated (e.g. home page content
   renders).
6. Visit `/login` directly while signed in: confirm you are redirected away. Open a protected
   page (e.g. `/enter`) while signed out, sign in, and confirm you land back on it
   (`callbackUrl`), and that `/login?callbackUrl=https://evil.example` redirects to `/` instead.
7. Sign in as a Cognito user that has no row in the app DB: confirm the German "not enabled"
   message appears and no session is created.
8. Repeat with a wrong password: confirm an inline error appears on `/login` without navigating
   away, and the email field retains its value.

### User Story 2 — First-time mandatory password change

1. Have an admin create a new user (temporary password issued by Cognito, per existing invite
   flow — unchanged).
2. Sign in at `/login` with the temporary password.
3. Confirm the page switches to a "choose a new password" form, in-app (no external redirect).
4. Submit a new password that violates Cognito's default policy (e.g. too short): confirm an
   inline error describing the requirement.
5. Submit a valid new password: confirm the user is signed in immediately without a second manual
   sign-in.

### User Story 3 — Forgot password

1. From `/login`, choose "forgot password".
2. Submit the test user's email. Confirm a generic "check your email" confirmation appears,
   in-app.
3. Submit a nonexistent email. Confirm the exact same confirmation appears (no account-existence
   leakage).
4. Retrieve the emailed verification code. Submit it with a new password.
5. Confirm you're returned to the sign-in form, and can now sign in with the new password.
6. Submit an incorrect/expired code: confirm an inline error and the ability to retry.

## Automated Verification

- `pnpm test` — unit tests for the new API route handlers and any pure helper functions
  (`mapCognitoErrorToUserMessage`, DTO validation).
- `pnpm test` also covers `lib/login-ticket.ts` (round trip, tampered, expired, wrong salt).
- `pnpm test:api` — not used for the four new routes; they are unit-tested with a mocked Cognito
  client (research Decision 13, plan.md Complexity Tracking). Existing `api-tests/` must keep
  passing.
- `pnpm playwright:test` — `playwright/auth.setup.ts` exercises the real same-origin sign-in
  against Cognito. `playwright/login.spec.ts` covers the first-login and forgot-password **UI
  flows with stubbed `/api/auth/*` responses** (`page.route()`), because temporary passwords and
  reset codes arrive by email. The real Cognito behavior for those two flows is verified by the
  manual steps above.

## Rollback

Reverting is low-risk: remove the `CredentialsProvider` from `lib/auth.ts`, remove
`pages.signIn` from `buildAuthConfig()`, revert `LoginRequired.tsx`'s button to call bare
`signIn()`, and (optionally) revert the `ALLOW_USER_PASSWORD_AUTH` CloudFormation change. The
existing Cognito OAuth Hosted-UI provider configuration is left untouched throughout this feature,
so it continues to function as an immediate fallback at every step.

## Rollout order

1. Deploy the `cloudformation.yaml` change (`ALLOW_USER_PASSWORD_AUTH`) to `test`, then `prod`.
2. Only then deploy the application code. Without the flag, every sign-in on `/login` fails with
   `InvalidParameterException`.
