---
description: 'Task list template for feature implementation'
---

# Tasks: Custom-Branded Login Page

**Input**: Design documents from `/specs/003-custom-login-page/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/auth-routes.md, quickstart.md

**Tests**: Included. The repository's constitution (Principle II) mandates tests for API routes;
per `research.md` Decision 13 and `plan.md`'s Complexity Tracking, these are Vitest unit tests
with a mocked Cognito client (not `api-tests/` integration tests), written before their
corresponding route implementation.

**Organization**: Tasks are grouped by user story (US1/US2/US3, matching `spec.md` priorities) to
enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Every task includes an exact file path

## Path Conventions

Single Next.js application at the repository root (see `plan.md` Project Structure) — no
`backend/`/`frontend/` split. Paths below are relative to the repo root.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Dependencies and infra changes needed before any code for this feature can be built
or tested.

- [ ] T001 Add `aws-sdk-client-mock` as a dev dependency (`yarn add -D aws-sdk-client-mock`) — required by all Cognito-route unit tests in later phases
- [ ] T002 [P] Add `ALLOW_USER_PASSWORD_AUTH` to `ExplicitAuthFlows` in the `JanusUserPoolClient` resource in `cloudformation.yaml` (see `research.md` Decision 2) — required for `InitiateAuthCommand` with `USER_PASSWORD_AUTH` to succeed against the deployed Cognito App Client
- [ ] T003 [P] Add `API_AUTH_SIGN_IN`, `API_AUTH_RESPOND_TO_NEW_PASSWORD_CHALLENGE`, `API_AUTH_FORGOT_PASSWORD`, `API_AUTH_CONFIRM_FORGOT_PASSWORD` route path constants in `lib/routes.ts`

**Checkpoint**: Infra and constants ready for foundational code.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared code that every user story's routes/pages depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T004 [P] Create `app/api/users/cognito-auth.ts` with a `mapCognitoErrorToUserMessage(e: unknown): { code: string; message: string }` helper translating Cognito SDK exceptions (`NotAuthorizedException`, `InvalidPasswordException`, `CodeMismatchException`, `ExpiredCodeException`, `LimitExceededException`, `TooManyRequestsException`, `TooManyFailedAttemptsException`) into German user-facing messages, per `contracts/auth-routes.md` and `research.md` Decision 7
- [ ] T005 [P] Add a `CredentialsProvider` to `buildAuthConfig()` in `lib/auth.ts`: `authorize()` decodes the `idToken` it's given (verify signature via the existing `getIssuer()`/JWKS, or trust tokens obtained server-side in the same request — decide during implementation) to extract `sub`, `email`, `name`, and the `cognito:groups` claim; calls the existing `checkIfUserExists()` helper (reused, per `research.md` Decision 5) keyed by `sub`; returns a `User` object augmented with a custom `groups` field on success, or `null`/throws on failure. Add `pages: { signIn: '/login' }` to the returned config (per `research.md` Decision 11)
- [ ] T006 Update the `jwt` callback in `lib/auth.ts` to read `groups` from the `user` object (not `profile`) when `account?.provider === 'credentials'`, per `research.md` Decision 3 (depends on T005 touching the same file)
- [ ] T007 [P] Modify `components/LoginRequired.tsx`: replace the bare `signIn()` call on the "Anmelden" button with navigation to `/login` (e.g. `useRouter().push('/login')`), keeping the existing `data-testid="login-button"` attribute unchanged, per `research.md` Decision 10
- [ ] T008 [P] Create `app/login/layout.tsx`: a minimal Next.js nested layout for the `/login` route segment that renders `children` without the app bar/navigation chrome that `app/layout.tsx` applies globally

**Checkpoint**: Foundation ready — user story implementation can now begin.

---

## Phase 3: User Story 1 - Sign in without leaving the app's look and feel (Priority: P1) 🎯 MVP

**Goal**: A signed-out user can sign in via a same-origin, app-styled form and land back in the
app fully authenticated, without ever navigating to the Cognito Hosted UI.

**Independent Test**: From a signed-out state, click the sign-in entry point, verify the form is
rendered with the app's own styling (no navigation to an external domain), submit valid
credentials for a user with a confirmed (non-temporary) password, and confirm the user lands back
in the app fully authenticated. Submit invalid credentials and confirm an inline, same-page error
appears.

### Tests for User Story 1

> Write these tests FIRST; confirm they FAIL before implementing the route.

- [ ] T009 [P] [US1] Unit test `app/api/auth/sign-in/route.test.ts` covering: valid credentials → `200 SUCCESS` with tokens; wrong password / nonexistent user → `401` generic "E-Mail oder Passwort ist falsch" (mocked `NotAuthorizedException`); malformed request body → `400`; Cognito-known-but-backend-unknown user → `403` (mock `checkIfUserExists` to return `false`); Cognito throttling → `429`. Mock `CognitoIdentityProviderClient` with `aws-sdk-client-mock`

### Implementation for User Story 1

- [ ] T010 [P] [US1] Add `SignInRequest` DTO (`email: string` with `@IsEmail()`, `password: string` with `@IsString() @IsNotEmpty()`) to `lib/dto.ts`
- [ ] T011 [US1] Add `initiateUserPasswordAuth(email, password)` wrapper to `app/api/users/cognito-auth.ts`: calls `InitiateAuthCommand` with `AuthFlow: 'USER_PASSWORD_AUTH'`; on success with no `ChallengeName`, decodes the returned `IdToken` for `sub`/`cognito:groups` and returns `{ status: 'SUCCESS', idToken, accessToken, refreshToken, expiresIn }`; on `ChallengeName === 'NEW_PASSWORD_REQUIRED'`, returns `{ status: 'CHALLENGE', challengeName: 'NEW_PASSWORD_REQUIRED', session }` (depends on T004's error-mapping helper existing in the same file)
- [ ] T012 [US1] Implement `app/api/auth/sign-in/route.ts` (`POST`): `validateOrThrow(SignInRequest, body)` → `initiateUserPasswordAuth()` → on `SUCCESS`, call `checkIfUserExists(sub)` (reused from `lib/auth.ts`, may need exporting it from there) and throw `ApiErrorForbidden` if it returns `false` → return the contract shape from `contracts/auth-routes.md`; wrap in `handleTopLevelCatch()`; map Cognito exceptions via `mapCognitoErrorToUserMessage()` to the correct `ApiError` subclass (depends on T010, T011)
- [ ] T013 [US1] Build `app/login/page.tsx`: a `'use client'` full-page form using `react-hook-form` with `Controller` (per `research.md` Decision 9), fields for email and password with `data-testid` attributes, a submit handler wired to a React Query `useMutation` calling `POST /api/auth/sign-in`; on `status: 'SUCCESS'`, call `signIn('credentials', { redirect: false, idToken, accessToken, refreshToken, email })` from `next-auth/react` and redirect to the originally intended page on success; on error, show an inline MUI `Alert` with the returned message without navigating away or clearing the email field; on `status: 'CHALLENGE'`, render a temporary placeholder (to be replaced by US2's task T019) so the flow doesn't dead-end
- [ ] T014 [US1] Update `playwright/auth.setup.ts`: remove the `getByRole('button', { name: 'Sign in with Cognito' })` click and the `input[name="username"]`/`input[name="password"]`/`input[name="signInSubmitButton"]` Cognito-hosted-UI locators; replace with same-origin `data-testid` locators against the new `/login` form fields from T013; re-evaluate whether the `// works only with firefox` restriction can be removed now that sign-in is same-origin (per `research.md` Decision 12)
- [ ] T015 [US1] Manually verify User Story 1 per `quickstart.md`'s "User Story 1" section, in both desktop and mobile viewport (Chrome DevTools device emulation), per constitution mobile-first principle

**Checkpoint**: User Story 1 is fully functional and independently testable — this is the MVP.

---

## Phase 4: User Story 2 - Complete first-time mandatory password change in the new UI (Priority: P2)

**Goal**: A newly invited user signing in with a temporary password is guided through setting a
new permanent password entirely within the app's UI, and is signed in immediately afterward.

**Independent Test**: Using an account with only a temporary password, sign in with it and verify
the app (not an external page) prompts for a new permanent password; submit a password that
violates Cognito's policy and see an inline error; submit a valid new password and confirm
immediate sign-in without a second manual step.

### Tests for User Story 2

- [ ] T016 [P] [US2] Unit test `app/api/auth/respond-to-new-password-challenge/route.test.ts` covering: valid new password + valid session → `200 SUCCESS` with tokens; password fails Cognito's policy → `400 InvalidPassword` (mocked `InvalidPasswordException`); expired/invalid session → `401` (mocked `NotAuthorizedException`); malformed request → `400`. Mock `CognitoIdentityProviderClient` with `aws-sdk-client-mock`

### Implementation for User Story 2

- [ ] T017 [P] [US2] Add `RespondToNewPasswordChallengeRequest` DTO (`email`, `newPassword` with `@MinLength(8)`, `session`) to `lib/dto.ts`
- [ ] T018 [US2] Add `respondToNewPasswordChallenge(email, newPassword, session)` wrapper to `app/api/users/cognito-auth.ts`: calls `RespondToAuthChallengeCommand` with `ChallengeName: 'NEW_PASSWORD_REQUIRED'`; on success, decodes the returned `IdToken` and returns the same `{ status: 'SUCCESS', ... }` shape as T011
- [ ] T019 [US2] Implement `app/api/auth/respond-to-new-password-challenge/route.ts` (`POST`): `validateOrThrow()` → `respondToNewPasswordChallenge()` → same backend-existence check and error-mapping pattern as T012; wrap in `handleTopLevelCatch()` (depends on T017, T018)
- [ ] T020 [US2] Extend `app/login/page.tsx` (replacing the placeholder from T013): when the sign-in mutation returns `status: 'CHALLENGE'`, switch view state to `{ step: 'new-password-required', email, cognitoSession: session }` (per `data-model.md`) and render a new-password + confirm-new-password form (`react-hook-form`, cross-field match validation); submit calls a new `useMutation` hitting `POST /api/auth/respond-to-new-password-challenge`; on success, call `signIn('credentials', ...)` exactly as in T013 and redirect; on error, show inline `Alert` and allow retry without losing the `cognitoSession`
- [ ] T021 [US2] Add a Playwright spec `playwright/login.spec.ts` covering the first-login challenge flow (requires a way to provision a fresh temporary-password test user — document the provisioning approach used, e.g. an admin-created test fixture user, in a comment at the top of the spec)
- [ ] T022 [US2] Manually verify User Story 2 per `quickstart.md`'s "User Story 2" section

**Checkpoint**: User Stories 1 AND 2 both work independently.

---

## Phase 5: User Story 3 - Recover access after forgetting a password (Priority: P3)

**Goal**: A user who forgot their password can request and complete a self-service reset entirely
within the app's UI, without revealing whether a given email has an account.

**Independent Test**: From the sign-in form, choose "forgot password", submit an email, retrieve
the emailed code, submit it with a new password, and confirm a subsequent sign-in with the new
password succeeds. Submitting a nonexistent email produces the identical confirmation message.

### Tests for User Story 3

- [ ] T023 [P] [US3] Unit test `app/api/auth/forgot-password/route.test.ts` covering: valid email → `200 CODE_SENT`; email with no account → `200 CODE_SENT` (identical response, per `contracts/auth-routes.md`); malformed email → `400`; Cognito throttling → `429`. Mock `CognitoIdentityProviderClient`
- [ ] T024 [P] [US3] Unit test `app/api/auth/confirm-forgot-password/route.test.ts` covering: valid code + valid new password → `200 PASSWORD_RESET`; wrong code → `400 CodeMismatch`; expired code → `400 CodeExpired`; password fails policy → `400 InvalidPassword`; malformed request → `400`. Mock `CognitoIdentityProviderClient`

### Implementation for User Story 3

- [ ] T025 [P] [US3] Add `ForgotPasswordRequest` (`email`) and `ConfirmForgotPasswordRequest` (`email`, `confirmationCode`, `newPassword` with `@MinLength(8)`) DTOs to `lib/dto.ts`
- [ ] T026 [US3] Add `requestPasswordReset(email)` and `confirmPasswordReset(email, code, newPassword)` wrappers to `app/api/users/cognito-auth.ts`, wrapping `ForgotPasswordCommand` and `ConfirmForgotPasswordCommand` respectively; `requestPasswordReset` swallows/normalizes any "user not found"-shaped failure into the same success response (per `research.md` Decision 8)
- [ ] T027 [US3] Implement `app/api/auth/forgot-password/route.ts` (`POST`): `validateOrThrow()` → `requestPasswordReset()` → always return `{ status: 'CODE_SENT' }` on anything except genuine infra errors; wrap in `handleTopLevelCatch()` (depends on T025, T026)
- [ ] T028 [US3] Implement `app/api/auth/confirm-forgot-password/route.ts` (`POST`): `validateOrThrow()` → `confirmPasswordReset()` → return `{ status: 'PASSWORD_RESET' }`; map `CodeMismatchException`/`ExpiredCodeException`/`InvalidPasswordException` via `mapCognitoErrorToUserMessage()`; wrap in `handleTopLevelCatch()` (depends on T025, T026)
- [ ] T029 [US3] Extend `app/login/page.tsx`: add a "forgot password?" link/button on the sign-in view that switches to `{ step: 'forgot-password-request' }`; build the email-only request form (submits to T027's route, then always shows a `showSuccess()` toast confirmation like "Falls ein Konto mit dieser E-Mail existiert, wurde ein Code gesendet" and switches to `{ step: 'forgot-password-confirm', email }`); build the code + new-password + confirm-new-password form (submits to T028's route; on success, `showSuccess()` and switch back to `{ step: 'sign-in' }`; on error, inline `Alert` with retry)
- [ ] T030 [US3] Add a Playwright spec extending `playwright/login.spec.ts` (or a new file) covering the forgot-password request + confirm flow, including the nonexistent-email case
- [ ] T031 [US3] Manually verify User Story 3 per `quickstart.md`'s "User Story 3" section

**Checkpoint**: All three user stories are independently functional. The feature is complete.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final checks spanning all three stories.

- [ ] T032 [P] Verify `/login` and all three of its view states render correctly and remain
      usable at a 375px-wide mobile viewport (per spec FR-012 and constitution's mobile-first
      principle), adjusting MUI layout/spacing as needed in `app/login/page.tsx`
- [ ] T033 Run `yarn lint:check`, `yarn format:check`, `yarn test`, and `yarn build`; fix any
      failures across all files touched by this feature
- [ ] T034 Walk through the full `quickstart.md` manually end-to-end (all three user stories in
      one pass) against a local dev environment with `ALLOW_USER_PASSWORD_AUTH` deployed to the
      `test` Cognito pool

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately.
- **Foundational (Phase 2)**: Depends on Setup (T001 must complete before any Cognito-mocked test
  is written, though foundational code itself has no runtime dependency on T001–T003). BLOCKS all
  user stories.
- **User Story 1 (Phase 3)**: Depends on Foundational completion. No dependency on US2/US3.
- **User Story 2 (Phase 4)**: Depends on Foundational completion. Extends the same
  `app/login/page.tsx` file US1 created (T020 replaces US1's placeholder), so in practice should
  follow US1 sequentially even though it's conceptually independent.
- **User Story 3 (Phase 5)**: Depends on Foundational completion. Also extends
  `app/login/page.tsx` (T029), so follows US1/US2 sequentially in the same file for the same
  reason.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### Within Each User Story

- Tests (if included) MUST be written and FAIL before implementing the corresponding route.
- DTOs before the Cognito wrapper functions that use them.
- Cognito wrapper functions before the route that calls them.
- Route implementation before the page code that calls it.

### Parallel Opportunities

- T002 and T003 (Setup) can run in parallel with each other, and with T001.
- T004, T005, T007, T008 (Foundational) touch different files and can run in parallel; T006
  depends on T005 (same file, `lib/auth.ts`).
- T009 and T010 (US1 tests/DTO) can run in parallel; T011 depends on T004 and T010.
- T016 and T017 (US2 tests/DTO) can run in parallel.
- T023, T024, T025 (US3 tests/DTOs) can all run in parallel.
- Across stories: once Foundational is done, a team could start US1, US2, and US3's
  test-writing/DTO/wrapper-function tasks in parallel, but the shared file
  `app/login/page.tsx` (T013 → T020 → T029) and shared file `app/api/users/cognito-auth.ts`
  (T004 → T011 → T018 → T026) mean the final integration step of each story should be done in
  priority order to avoid merge conflicts.

---

## Parallel Example: Foundational Phase

```bash
# Launch independent foundational tasks together:
Task: "Create app/api/users/cognito-auth.ts with mapCognitoErrorToUserMessage() helper"
Task: "Add CredentialsProvider + pages.signIn to lib/auth.ts"
Task: "Modify components/LoginRequired.tsx to navigate to /login"
Task: "Create app/login/layout.tsx"
```

## Parallel Example: User Story 1

```bash
# Launch test + DTO together (different files):
Task: "Unit test app/api/auth/sign-in/route.test.ts"
Task: "Add SignInRequest DTO to lib/dto.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (blocks everything else).
3. Complete Phase 3: User Story 1.
4. **STOP and VALIDATE**: run T015's manual check plus `yarn test`/`yarn playwright:test`.
   At this point, every user with a confirmed (non-temporary) password can sign in through the new
   `/login` page — the Hosted UI is already fully bypassed for the majority of everyday sign-ins.
5. Deploy/demo if ready — new/temporary-password users and forgot-password users would still need
   the old flow until US2/US3 land, so don't fully decommission the Hosted UI provider config
   until all three stories are done (it isn't touched by this plan anyway, per `research.md`
   Decision 2).

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. Add User Story 1 → validate → this is the MVP.
3. Add User Story 2 → validate → new-user onboarding no longer touches the Hosted UI either.
4. Add User Story 3 → validate → self-service password recovery no longer touches the Hosted UI.
5. Polish phase → mobile check, lint/format/test/build, full quickstart walkthrough.

---

## Notes

- [P] tasks touch different files and have no unmet dependencies.
- [Story] labels map every implementation task to its user story for traceability back to
  `spec.md`.
- `app/login/page.tsx` and `app/api/users/cognito-auth.ts` are each touched by all three stories
  sequentially — this is intentional (one page with three view states; one Cognito-auth wrapper
  module with one function per operation), not a sign of poor story isolation. Each story remains
  independently testable because it adds a self-contained view/route without altering the
  behavior of previously completed stories.
- Commit after each task or logical group, consistent with repository convention.
- Verify each route's unit test fails before implementing the route (red-green-refactor), per the
  constitution's TDD principle applied at the unit-test level (research.md Decision 13).
