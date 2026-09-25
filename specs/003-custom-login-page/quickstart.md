# Quickstart: Verifying the Custom-Branded Login Page

## Prerequisites

- Local Postgres running (`podman-compose up -d` or equivalent, per `README.md`).
- `.env.development.local` populated with existing `COGNITO_CLIENT_ID`, `COGNITO_REGION`,
  `COGNITO_USER_POOL_ID` (already present — no new env vars required).
- The Cognito App Client for the environment you're testing against (dev/test) must have
  `ALLOW_USER_PASSWORD_AUTH` enabled (see `cloudformation.yaml` change in this feature). For local
  development against the shared dev/test Cognito pool, this requires the CloudFormation change to
  have been deployed first (automatic on PR open/update per `.github/workflows/run-on-pull-requests.yaml`).
- A Cognito test user with a **confirmed** (non-temporary) password, for exercising the plain
  sign-in path (User Story 1). A second, freshly admin-created user with only a temporary password,
  for exercising the first-login challenge path (User Story 2).

## Manual Verification Steps

### User Story 1 — Everyday sign-in

1. `yarn start:dev`.
2. Navigate to `/` while signed out. Click "Anmelden".
3. Confirm you land on `/login` (same origin, app-styled), not an external AWS domain.
4. Enter the confirmed test user's email/password. Submit.
5. Confirm you are redirected back into the app, fully authenticated (e.g. home page content
   renders).
6. Repeat with a wrong password: confirm an inline error appears on `/login` without navigating
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

- `yarn test` — unit tests for the new API route handlers and any pure helper functions
  (`mapCognitoErrorToUserMessage`, DTO validation).
- `yarn test:api` — integration tests in `api-tests/` for the four new routes, per the
  constitution's TDD-for-API-routes requirement. These will need a way to exercise Cognito
  interactions (see plan.md's Testing Strategy section for how existing tests avoid live Cognito
  calls, and how these new tests should handle needing a _real_ Cognito call, unlike other
  existing API tests).
- `yarn playwright:test` — updated `playwright/auth.setup.ts` (and any new specs covering the
  first-login and forgot-password flows) exercising the full same-origin flow.

## Rollback

Reverting is low-risk: remove the `CredentialsProvider` from `lib/auth.ts`, remove
`pages.signIn` from `buildAuthConfig()`, revert `LoginRequired.tsx`'s button to call bare
`signIn()`, and (optionally) revert the `ALLOW_USER_PASSWORD_AUTH` CloudFormation change. The
existing Cognito OAuth Hosted-UI provider configuration is left untouched throughout this feature,
so it continues to function as an immediate fallback at every step.
