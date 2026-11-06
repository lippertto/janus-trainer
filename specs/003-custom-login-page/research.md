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

**Amendment (review)**: `authorize()` MUST NOT accept raw Cognito tokens from the browser — see
Decision 14. The API routes never return Cognito tokens to the client; they return an opaque,
server-encrypted, short-lived _login ticket_ that `authorize()` decrypts.

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

**Decision**: The sign-in / challenge-response routes decode the `IdToken` returned by Cognito
(server-side, directly from the Cognito response, so no signature check is needed at this point —
the token arrived over TLS from the SDK call we just made) and read `sub`, `email`, `name` and
`cognito:groups` from it. These claims travel to `authorize()` inside the login ticket
(Decision 14). `authorize()` returns a `User` with `id = sub` (NextAuth derives `token.sub` and
`session.userId` from `user.id`), plus `name`, `email`, `groups`, `accessToken`, `refreshToken` and
`accessTokenExpires`.

The `jwt` callback in `lib/auth.ts` gets an explicit branch **before** the existing OAuth branch:

```ts
if (account?.provider === 'credentials' && user) {
  token.accessToken = user.accessToken;
  token.refreshToken = user.refreshToken;
  token.accessTokenExpires = user.accessTokenExpires;
  token.groups = user.groups;
  return token;
}
```

This is required: the existing OAuth branch does `if (!profile) return token;`, and credentials
sign-ins never have a `profile`, so without an explicit branch they would silently get a session
with no `accessToken` and no `groups`. The `User`/`JWT` type augmentations needed for the extra
fields go into the existing `types/` directory.

**Rationale**: The ID token already contains the `cognito:groups` claim regardless of which
Cognito auth flow produced it — no extra `AdminListGroupsForUserCommand` call needed. Group data
keeps flowing exclusively from Cognito (FR-002).

**Alternatives considered**: Calling `AdminListGroupsForUserCommand` as a second round trip.
Rejected: unnecessary extra call and latency.

## Decision 4: Token refresh — fix `refreshAccessToken()` instead of reusing it unchanged

**Decision**: Rewrite `refreshAccessToken()` in `lib/auth.ts` to call Cognito through the SDK:
`InitiateAuthCommand({ AuthFlow: 'REFRESH_TOKEN_AUTH', AuthParameters: { REFRESH_TOKEN } })` via
`cognitoClient()`, replacing the current `fetch` to the Hosted-UI `/oauth2/token` endpoint. Keep
the old refresh token when Cognito doesn't return a new one (it doesn't, unless rotation is on),
and refresh `groups` from the new `IdToken`. Also fix the OAuth branch's expiry computation
(`Date.now() + account.expires_at! * 1000` → `account.expires_at! * 1000`; `expires_at` is
already an epoch in seconds).

**Rationale**: The earlier assumption that the existing function could be reused unchanged was
wrong; reviewing it showed it has never worked:

- The URL is built as `'…/oauth2/token' + new URLSearchParams(...)` — no `?`, and the body is
  never sent.
- The domain is hard-coded to the prod Hosted-UI domain (`janus-trainer-app.auth.…`), whereas the
  pool domains are per environment (`janus-trainer-app-${env}`).
- It has been masked by the expiry bug above: `Date.now() + expires_at * 1000` puts the expiry
  tens of thousands of years in the future, so refresh never fires.

Credential sessions will compute a correct expiry (`Date.now() + expiresIn * 1000`), so refresh
_will_ fire after ~1 hour and must work. Moving it to the SDK also removes a runtime dependency on
the Hosted-UI domain, in line with the spec's decoupling goal (SC-005), and works identically for
sessions created via either sign-in path (the fallback OAuth provider is kept).

**Consequence**: Fixing the expiry also activates refresh for OAuth sessions, and a failed refresh
yields `error: 'RefreshAccessTokenError'` on the token. The `session` callback must expose that
error and the client must send the user to `/login` (sign out) when it sees it — otherwise the user
is left with a session that silently has a stale access token. This is covered by tasks T005b/T005c.

**Alternatives considered**: Mirroring the current (broken-but-dormant) behavior. Rejected: it
would hide the bug only until the first credential session reaches its first expiry, and would
leave stale Cognito groups in 30-day sessions.

## Decision 5: Backend-user existence check — enforced once, in the existing `signIn` callback

**Decision**: Do **not** add `checkIfUserExists()` calls to the new routes or to `authorize()`.
NextAuth already runs the `signIn` callback for credentials sign-ins, with
`account.providerAccountId === user.id === sub`, so the existing check in `lib/auth.ts` covers the
new path with no change. A rejected user gets `signIn(...)` result `{ error: 'AccessDenied' }` on
the client, which `/login` maps to a German message.

**Rationale**: FR-003 requires the rejection to be preserved. A check in the sign-in route alone
would not be enforcement, since the session is only minted by `authorize()` + the `signIn`
callback. Having one enforcement point avoids two or three redundant `HEAD` round trips and
divergent behavior. Today's baseline for this case is NextAuth's `AccessDenied` error; the new
page shows an equivalent German message ("Dein Konto ist in dieser App nicht freigeschaltet. …").

**Trade-off**: For a first-time user who is unknown to the backend, the password change succeeds in
Cognito before the denial. This is identical to the situation today with the Hosted UI.

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
non-blocking confirmations like "check your email"). The app bar is suppressed on `/login`
as described in Decision 15 (not via a nested layout).

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
navigation to `/login?callbackUrl=…` (see Decision 16), removing the then-unused `signIn` import, preserving the
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

**Scope of new E2E specs**: The temporary password and the reset code are delivered by email, which
Playwright cannot read. `playwright/login.spec.ts` therefore stubs the four `/api/auth/*` routes
with `page.route()` to cover the UI state machine (challenge → new-password form → success;
request → confirm → back to sign-in; inline errors; identical message for unknown email). The real
Cognito interaction for these two flows is verified manually (quickstart) in the `test` pool.

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

**What still gets tested elsewhere**: DTO validation (`400` responses) needs no Cognito and is
covered in the route unit tests. The backend-recognition check is enforced by the existing `signIn`
callback (Decision 5) and the `HEAD /api/users/{userId}` endpoint it calls is already covered as
today. The ticket encode/decode round trip (Decision 14) gets its own unit tests, including
tampered, expired and wrong-salt tickets.

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

## Decision 14: Login ticket instead of raw tokens in the browser (security-critical)

**Decision**: The API routes `sign-in` and `respond-to-new-password-challenge` never return
Cognito tokens to the client. On success they return `{ status: 'SUCCESS', ticket }`, where
`ticket` is produced by `encode()` from `next-auth/jwt` with:

- `secret: process.env.NEXTAUTH_SECRET`
- a dedicated `salt` (`'janus-login-ticket'`), so a ticket can never be accepted as a session
  cookie and vice versa
- `maxAge: 60` (seconds)
- payload: `sub`, `email`, `name`, `groups`, `accessToken`, `refreshToken`, `expiresIn`

The client then calls `signIn('credentials', { redirect: false, ticket })`. `authorize()` calls
`decode()` with the same secret/salt; a missing, tampered or expired ticket returns `null`.

**Rationale**: The earlier draft returned `idToken`/`accessToken`/`refreshToken` to the browser and
had it post them back to `authorize()`, leaving verification as "decide during implementation".
The server cannot know that tokens posted to the credentials callback came from its own
sign-in route. Without verification an attacker could forge an ID token with `sub=<admin>` and
`cognito:groups: ["admins"]` and receive an admin session. It would also expose the refresh token
to page JavaScript, whereas today it lives only in NextAuth's encrypted, httpOnly cookie. An
encrypted-and-authenticated (JWE) ticket is unforgeable without `NEXTAUTH_SECRET`, opaque to JS,
needs no server-side state (works with multiple instances), and expires almost immediately.

**Residual risk**: A ticket is a bearer credential for ~60 seconds. It is only ever held in JS
memory for the duration of one `fetch` → `signIn` hop over TLS and is never logged or persisted.
Single-use enforcement would need shared state and is not worth the complexity here.

**Alternatives considered**:

- Verifying the posted ID token against the pool's JWKS in `authorize()` (`jose`/`aws-jwt-verify`;
  `jose` is only a transitive dependency, so it would need adding). Rejected as the primary
  design: it proves the ID token is genuine, but not that it was meant for this login, and still
  exposes the refresh token to the browser. Remains a viable fallback if the ticket approach
  proves problematic.
- Calling Cognito from inside `authorize()` directly. Rejected for the reasons in Decision 1
  (challenge state can't be returned).

## Decision 15: Suppressing the app chrome on `/login`

**Decision**: A nested `app/login/layout.tsx` is **not** used. Nested layouts render inside the
root layout, so the app bar, drawer and `pt: 3` wrapper from `app/layout.tsx` would still appear.
Instead, `JanusAppbar` (already a client component) reads `usePathname()` and returns `null` on
`/login`. `TermsAcceptance` already renders nothing without a session, so it needs no change.

**Rationale**: Route groups with separate root layouts would require moving every existing page.
A pathname check is a three-line change. It also prevents a signed-out user from seeing a drawer
of links to protected pages on the login screen.

## Decision 16: Return-to-page and already-signed-in handling (FR-011)

**Decision**: `LoginRequired` navigates to `/login?callbackUrl=<current path + search>`. `/login`
reads `callbackUrl`, accepts it only if it is a same-origin relative path (starts with a single
`/`, not `//`), and falls back to `/`. After `signIn(..., { redirect: false })` succeeds, the page
does `router.replace(callbackUrl)` followed by `router.refresh()` so the new session is picked up.
A user who already has a session and visits `/login` is redirected to `callbackUrl`.
NextAuth's own redirects use `pages.signIn` (Decision 11), which already appends `callbackUrl`.

## Open items deferred to `spec.md` Assumptions (not re-litigated here)

- No MFA support (not configured on the user pool; out of scope per spec Assumptions).
- No changes to how new users are invited/created (temporary password issuance is unchanged).
- No changes to password strength rules (Cognito's default policy remains in effect; the UI will
  surface Cognito's own `InvalidPasswordException` messages/hints, not invent new rules).
