# Phase 0 Research: Custom-Branded Login Page

## Decision 1: Where does the Cognito SDK orchestration for sign-in live?

**Decision**: New plain Next.js API routes under `app/api/auth/` (not inside NextAuth's
`CredentialsProvider.authorize()`), reusing the existing `ApiError`/`handleTopLevelCatch`
convention from `lib/helpers-for-api.ts`. `authorize()` itself only trusts an
already-Cognito-authenticated token bundle and mints the NextAuth session.

**Rationale**: NextAuth v4's `CredentialsProvider.authorize()` can only return a `User | null`
or throw an `Error` whose `.message` becomes a URL-encoded string in the callback redirect
(`node_modules/next-auth/core/routes/callback.js`). There is no channel to return rich,
structured state (e.g. `{ challengeName: 'NEW_PASSWORD_REQUIRED', session: '<token>' }`) through
that contract. Cognito's `InitiateAuthCommand` needs to return exactly that kind of structured,
multi-step state for the NEW_PASSWORD_REQUIRED challenge. Building this orchestration as an
ordinary API route lets us return full structured JSON (mirroring every other route in this
codebase) and keeps `authorize()`'s job small and safe: verify credentials/tokens that were
already validated against Cognito, and mint a session.

**Alternatives considered**:

- Encoding challenge state into the thrown `Error.message` string in `authorize()`, relying on
  `signIn('credentials', { redirect: false })` to surface `result.error` on the client. Rejected:
  fragile (message goes through `encodeURIComponent`/URL parsing, awkward to pack a session
  token + challenge name safely), and it forces the login page to orchestrate multi-step Cognito
  state through NextAuth's client API, which isn't designed for that.
- Implementing SRP (Secure Remote Password) client-side via `amazon-cognito-identity-js` to avoid
  enabling `USER_PASSWORD_AUTH`. Rejected: much higher implementation complexity, an additional
  dependency, and the constitution/spec does not require avoiding a Cognito infra change.

## Decision 2: Enable `ALLOW_USER_PASSWORD_AUTH` on the existing Cognito App Client

**Decision**: Add `ALLOW_USER_PASSWORD_AUTH` to `ExplicitAuthFlows` in
`JanusUserPoolClient` (`cloudformation.yaml`), alongside the existing
`ALLOW_USER_SRP_AUTH` and `ALLOW_REFRESH_TOKEN_AUTH`. Leave the OAuth Hosted-UI-related
properties (`AllowedOAuthFlows`, `CallbackURLs`, `AllowedOAuthFlowsUserPoolClient`) in place for
now — they are independent of the new flow and removing them is not required.

**Rationale**: `InitiateAuthCommand({ AuthFlow: 'USER_PASSWORD_AUTH' })` is rejected with
`InvalidParameterException` unless the app client explicitly allows this auth flow. This is a
one-line, additive, low-risk infra change (nothing existing is removed). Per the repo's CI setup
(`.github/workflows/run-on-pull-requests.yaml`), any PR touching `cloudformation.yaml` deploys the
change to the `test` Cognito pool automatically, so this can be verified end-to-end before merge.

**Alternatives considered**: Removing the OAuth Hosted-UI config entirely in this same feature.
Rejected for now: the spec calls for removing the Hosted UI from the _application's_ sign-in
flow, not necessarily decommissioning the underlying app-client capability immediately; keeping
it reduces risk and rollback effort. It can be cleaned up in a later, separate change once the
new flow has proven stable in production.

## Decision 3: Cognito user pool groups (RBAC) for credential-based sessions

**Decision**: Decode the `IdToken` JWT returned by `InitiateAuthCommand`/
`RespondToAuthChallengeCommand` and read its `cognito:groups` claim directly, exactly like the
existing `CognitoProvider.profile()` callback does for the OAuth flow. Pass `groups` through as a
field on the `User` object returned by `authorize()`. Update the `jwt` callback in `lib/auth.ts`
to read `groups` from `user` when `account?.provider === 'credentials'`, instead of from
`profile['cognito:groups']` (which won't exist for this provider).

**Rationale**: The ID token already contains the same `cognito:groups` claim regardless of which
Cognito auth flow produced it — no extra `AdminListGroupsForUserCommand` call needed. This keeps
group/permission data flowing exclusively from Cognito, matching FR-002 (no change to where
accounts/passwords/groups are stored) and avoiding scope creep into `docs/cognito-migration.md`'s
separate (and explicitly different) DB-backed groups plan.

**Alternatives considered**: Calling `AdminListGroupsForUserCommand` (already used elsewhere in
`app/api/users/cognito.ts`) as a second round trip. Rejected: unnecessary extra Cognito API call
and latency; the ID token already carries this claim.

## Decision 4: Token refresh reuse

**Decision**: Reuse the existing `refreshAccessToken()` function in `lib/auth.ts` unchanged for
credential-based sessions.

**Rationale**: Cognito refresh tokens behave identically regardless of which `AuthFlow` originally
produced them (`USER_PASSWORD_AUTH` vs. the OAuth Authorization Code flow). The existing refresh
logic already POSTs to Cognito's `/oauth2/token` endpoint using only `client_id` and
`refresh_token` — no flow-specific data is involved.

## Decision 5: Backend-user existence check

**Decision**: Reuse the existing `checkIfUserExists()` helper (currently called from the
`signIn` callback) inside the new credentials `authorize()` path too, keyed by the Cognito `sub`
claim from the decoded ID token (same identifier the OAuth flow already uses as
`account.providerAccountId`).

**Rationale**: FR-003 explicitly requires preserving this existing rejection behavior
("Cognito knows the user, but the app's own backend does not"). Reusing the same helper avoids
divergent behavior between the two sign-in paths.

## Decision 6: Forgot-password and first-login-challenge routes are plain API routes, not NextAuth

**Decision**: `ForgotPasswordCommand`/`ConfirmForgotPasswordCommand` and
`RespondToAuthChallengeCommand` (for `NEW_PASSWORD_REQUIRED`) are implemented as ordinary Next.js
API routes under `app/api/auth/`, following the existing `ApiError`/`handleTopLevelCatch`
pattern, not routed through NextAuth at all.

**Rationale**: These operations are not "establish a NextAuth session" operations — they are
Cognito account-management operations that only _lead up to_ a subsequent sign-in. Modeling them
as ordinary REST endpoints keeps them consistent with every other API route in the app and keeps
NextAuth's `authorize()` narrowly scoped (Decision 1).

## Decision 7: Where Cognito auth-flow SDK calls live in the codebase

**Decision**: New module `app/api/users/cognito-auth.ts` (sibling to the existing
`app/api/users/cognito.ts` admin-operations module), reusing the existing `cognitoClient()`
singleton factory from `app/api/users/cognito-client.ts`. Contains thin wrapper functions:
`initiateUserPasswordAuth`, `respondToNewPasswordChallenge`, `requestPasswordReset`,
`confirmPasswordReset`, and a `mapCognitoErrorToUserMessage()` helper that translates Cognito SDK
exceptions (`NotAuthorizedException`, `InvalidPasswordException`, `CodeMismatchException`,
`ExpiredCodeException`, `LimitExceededException`, `TooManyRequestsException`, etc., all subclasses
of `CognitoIdentityProviderServiceException`) into German user-facing messages, mirroring the
existing error-handling idiom in `app/api/users/cognito.ts`.

**Rationale**: Keeps the new code next to its closest precedent (the existing Cognito admin
wrapper module already uses the same client and the same "catch specific AWS exceptions, wrap in
ApiError subclasses" idiom). Avoids a second Cognito client instance.

## Decision 8: Error messages are generic for user-enumeration prevention

**Decision**: For sign-in failures, the API and UI treat "no such user" and "wrong password" as
the exact same generic error: "E-Mail oder Passwort ist falsch." For forgot-password requests,
the API always responds success-shaped regardless of whether the account exists.

**Rationale**: `cloudformation.yaml`'s `JanusUserPoolClient` already sets
`PreventUserExistenceErrors: ENABLED`, meaning Cognito itself already returns
`NotAuthorizedException` (not `UserNotFoundException`) for nonexistent users during
`USER_PASSWORD_AUTH`. Matching this in the new UI/API is required to actually get the security
benefit of that existing setting, and directly satisfies spec FR-008 for forgot-password.

## Decision 9: Form library and page structure

**Decision**: Build `app/login/page.tsx` as a full-page (non-dialog) form using
`react-hook-form` with the `Controller` pattern (same idiom as `app/accounts/UserDialog.tsx`),
with three mutually exclusive view states managed by local component state: `sign-in`,
`new-password-required`, `forgot-password`. Each state's submit action calls a dedicated React
Query `useMutation` hitting the corresponding new API route. Field-level and top-level errors are
shown inline via MUI `Alert`/`helperText` (not `showError` toasts, which are reserved for
non-blocking confirmations like "check your email"). A nested `app/login/layout.tsx` suppresses
the app bar/navigation chrome for a focused, full-page login experience.

**Rationale**: `react-hook-form` is already a dependency and is the established pattern for
multi-field forms with validation in this codebase (`UserDialog.tsx`). This is the first
full-page (non-dialog) form in the app, which is an intentional, spec-driven exception
(pre-authentication screens conventionally aren't dialogs). ToNews/snackbar (`showError`) is
reserved by convention for transient, dismissable confirmations post-authentication; a
pre-auth screen benefits more from persistent inline errors the user can't accidentally dismiss
mid-flow.

**Alternatives considered**: Reusing the `EditIbanDialog`-style plain `useState` pattern.
Rejected: three fields with cross-field password-confirmation validation (in the
new-password-required state) benefit more from `react-hook-form`'s `Controller`/`rules.validate`
machinery, matching the more complex existing precedent (`UserDialog.tsx`) rather than the
simpler one.

## Decision 10: `LoginRequired` and sign-in entry points

**Decision**: Change `components/LoginRequired.tsx`'s button from `signIn()` to
`router.push('/login')` (or a plain `<Link href="/login">`), preserving the
`data-testid="login-button"` attribute so existing Playwright locators for _finding_ the button
keep working (only the subsequent navigation target changes).

**Rationale**: `LoginRequired` is the single shared gate used by all ~15 protected pages
(`grep -rn "LoginRequired" app/ components/`), so this one change updates every entry point at
once, satisfying FR-010 without per-page edits.

## Decision 11: NextAuth `pages.signIn` configuration

**Decision**: Add `pages: { signIn: '/login' }` to `buildAuthConfig()` in `lib/auth.ts`.

**Rationale**: This ensures that any NextAuth-internal redirect to "the sign-in page" (e.g. after
a session expires and a protected server action calls `signIn()` implicitly, or NextAuth's own
default error handling) lands on the new custom page rather than NextAuth's own default
provider-chooser page, keeping FR-010 satisfied for all paths, not just the explicit
`LoginRequired` button click.

## Decision 12: E2E test updates

**Decision**: Update `playwright/auth.setup.ts` to remove the
`getByRole('button', { name: 'Sign in with Cognito' })` click and the Cognito-hosted-UI-specific
`input[name="username"]`/`input[name="password"]`/`input[name="signInSubmitButton"]` locators,
replacing them with `data-testid` locators on the new same-origin `/login` form fields. Re-evaluate
whether the existing `// Note that this currently works only with firefox and not with chrome`
restriction in that file can be lifted, since it was likely caused by third-party-cookie/
cross-origin quirks specific to the old Cognito-Hosted-UI redirect, which no longer applies once
sign-in is same-origin.

**Rationale**: Directly required for the existing Playwright auth setup to keep working; the
constitution requires Playwright coverage for critical paths, and sign-in is the most critical
path of all.

## Decision 13: Testing strategy for Cognito-calling API routes (new precedent)

**Decision**: Introduce `aws-sdk-client-mock` (a widely-used, purpose-built mocking library for
AWS SDK v3 clients) as a new dev dependency, and unit-test the four new API routes
(`app/api/auth/*/route.ts`) with mocked `CognitoIdentityProviderClient` responses in regular
Vitest unit tests (`*.test.ts` colocated with the route, run via `yarn test`), rather than in
`api-tests/`. Do **not** attempt to exercise real Cognito calls from `api-tests/`.

**Rationale**: This is genuinely new territory for the repo. Investigation confirmed that:

- No AWS SDK mocking pattern exists anywhere in the codebase today.
- The only Cognito-writing routes that exist today (`POST`/`PUT`/`DELETE /api/users`, which call
  `AdminCreateUserCommand` etc.) are **never exercised by `api-tests/`** — the existing pattern is
  to simply not test AWS-touching code paths at the integration level, not to mock them.
- `cognitoClient()` builds an unmocked, real `CognitoIdentityProviderClient`; there is no local
  Cognito emulator (no LocalStack, no `cognito-local`) in this repo's tooling.
- Calling real Cognito from `api-tests/` would require provisioning dedicated, stable test users
  with known passwords in the shared dev-Cognito pool, and would make tests slower, flakier
  (network-dependent), and harder to reset between runs (e.g., a `NEW_PASSWORD_REQUIRED` test user
  can only go through that challenge once before it has a permanent password).

This is a deliberate, documented deviation from the constitution's general "TDD for API routes,
tests in `api-tests/` against real Postgres" principle, justified because that principle's stated
purpose is catching _database_ schema/constraint issues via real Postgres — it says nothing about
external third-party identity provider calls, and the existing codebase already treats
Cognito-writing routes as out of scope for `api-tests/` for exactly this reason. See
`plan.md`'s Complexity Tracking section for how this is recorded as a justified exception.

**What still gets tested in `api-tests/`**: The parts of these routes that touch our own database
or backend logic without going through Cognito — specifically, `checkIfUserExists()`'s HEAD call
to `/api/users/{userId}` (reused, research Decision 5) can still be exercised as it already is
today, and the DTO validation (`400` responses for malformed input) does not require Cognito at
all and can be tested at either level. Only the actual Cognito `InitiateAuthCommand`/
`RespondToAuthChallengeCommand`/`ForgotPasswordCommand`/`ConfirmForgotPasswordCommand` calls are
mocked.

**Alternatives considered**:

- Calling real Cognito from `api-tests/` against the dev pool. Rejected per rationale above
  (flakiness, test-user lifecycle management, network dependency, no precedent).
- Skipping automated testing of the Cognito interaction entirely. Rejected: leaves the most
  security-sensitive new code (authentication) without any test coverage, violating the
  constitution's Security-First principle even if the TDD-in-`api-tests/` principle doesn't
  strictly apply.
- Writing a hand-rolled mock (manually replacing `cognitoClient()` via dependency injection)
  instead of `aws-sdk-client-mock`. Rejected: `aws-sdk-client-mock` is the standard, well-maintained
  library for this exact purpose across the AWS SDK v3 ecosystem, and integrates cleanly with
  Vitest's existing `vi.mock`-free style without needing to restructure `cognito-client.ts`.

## Open items deferred to `spec.md` Assumptions (not re-litigated here)

- No MFA support (not configured on the user pool; out of scope per spec Assumptions).
- No changes to how new users are invited/created (temporary password issuance is unchanged).
- No changes to password strength rules (Cognito's default policy remains in effect; the UI will
  surface Cognito's own `InvalidPasswordException` messages/hints, not invent new rules).
