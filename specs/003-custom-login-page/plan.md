# Implementation Plan: Custom-Branded Login Page

**Branch**: `003-custom-login-page` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-custom-login-page/spec.md`

## Summary

Replace the AWS Cognito Hosted UI redirect with an in-app `/login` page that visually matches the
rest of the application. Sign-in, the mandatory first-time password change
(`NEW_PASSWORD_REQUIRED`), and forgot-password all happen without leaving the app's own domain/UI.
Cognito remains the sole identity store (no schema changes, no new persisted user data) — this is
purely a UI/orchestration change: enable `USER_PASSWORD_AUTH` on the existing Cognito App Client,
add four new plain Next.js API routes that wrap the relevant AWS SDK Cognito calls
(`InitiateAuthCommand`, `RespondToAuthChallengeCommand`, `ForgotPasswordCommand`,
`ConfirmForgotPasswordCommand`), add a `CredentialsProvider` to NextAuth whose `authorize()` accepts only a short-lived,
server-encrypted login ticket (never raw Cognito tokens from the browser) to mint the existing
`JanusSession`, fix the dormant token-refresh logic, and build the `/login` page
itself with `react-hook-form` following the `UserDialog.tsx` idiom.

## Technical Context

**Language/Version**: TypeScript (strict mode), Next.js 16 App Router, React 19

**Primary Dependencies**: `next-auth` 4.24 (`CredentialsProvider`),
`@aws-sdk/client-cognito-identity-provider` 3.x (already a dependency), `react-hook-form` 7.x
(already a dependency), MUI 9, TanStack React Query 5, `class-validator` (DTOs),
`aws-sdk-client-mock` (**new** dev dependency, for unit-testing the Cognito-calling routes —
see research.md Decision 13)

**Storage**: N/A — no database schema changes. Cognito remains the sole identity/credential store.

**Testing**: Vitest unit tests (`pnpm test`) for the new API routes with mocked Cognito responses;
Playwright (`pnpm playwright:test`) updates to `playwright/auth.setup.ts` and new specs for the
first-login-challenge and forgot-password flows.

**Target Platform**: Web (existing Next.js standalone Docker deployment, unchanged)

**Project Type**: Web application (existing single Next.js app — no new "frontend"/"backend"
split; API routes and pages both live in the same `app/` tree per existing convention)

**Performance Goals**: Matches spec SC-002 (sign-in completes in under 30 seconds end-to-end,
excluding typing time) — no new performance requirements beyond current Hosted-UI-based flow.

**Constraints**:

- No changes to where user identities/passwords/groups are stored (spec Assumption).
- No MFA (not configured on the user pool; out of scope).
- Existing `checkIfUserExists()` backend-recognition rejection behavior must be preserved
  (spec FR-003) — enforced once, by the existing NextAuth `signIn` callback (research Decision 5).
- Cognito tokens MUST NOT be sent to or accepted from the browser; `authorize()` accepts only an
  encrypted, 60-second login ticket (research Decision 14).
- Deployment order: the `cloudformation.yaml` change (`ALLOW_USER_PASSWORD_AUTH`) MUST be deployed
  to each environment (test, then prod) **before** the app code that uses it.
- Existing Cognito OAuth Hosted-UI provider config in `cloudformation.yaml` is left in place
  (not removed) for rollback safety, even though no in-app entry point will link to it anymore.

**Scale/Scope**: One new page (`app/login/page.tsx`), four new API routes, one new
Cognito-auth wrapper module and a small ticket module, edits to `lib/auth.ts` (credentials
provider, `jwt` callback branch, SDK-based refresh, expiry fix),
`app/JanusAppbar.tsx` and `components/LoginRequired.tsx`, one
CloudFormation property addition, Playwright test updates. No new user-facing pages beyond
`/login` itself (the three "steps" are view states within one page, per research Decision 9).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design below._

- **I. Mobile-First for Trainer Views**: `/login` is not one of the explicitly named
  mobile-first routes (`/enter`), but trainers do sign in from mobile devices, so the constitution's
  underlying intent applies. **Plan**: build `/login` responsively using the same MUI
  components/patterns as the rest of the app; verify in mobile viewport per spec FR-012. PASS
  (with mobile verification tracked as a task, and `autoComplete`/`inputMode`/44px tap-target
  requirements written into the page tasks).
- **II. Test-Driven Development for API Routes**: Normally requires `api-tests/` integration
  tests against real Postgres, written first. **Deviation**: the Cognito-calling logic in the four
  new routes cannot reasonably be tested against real Cognito in `api-tests/` (see research.md
  Decision 13 for full justification — this follows the codebase's own existing, if implicit,
  precedent of not exercising Cognito-writing routes from `api-tests/`). **Mitigation**: these
  routes get first-written, red-green-refactor unit tests with mocked Cognito responses instead,
  documented as a Complexity Tracking exception below. Any non-Cognito logic in these routes (DTO
  validation, the reused `checkIfUserExists` backend check) remains tested in whichever layer is
  most appropriate, consistent with existing conventions.
- **III. Security-First API Design**: New routes are intentionally unauthenticated
  (pre-login by nature), but MUST: issue only encrypted login tickets instead of tokens
  (research Decision 14, which satisfies the "JWT token verification enforced" rule for the new
  path: the ticket is authenticated with `NEXTAUTH_SECRET` and expires after 60 s); validate all input via DTOs + `validateOrThrow()`; never log
  passwords, tokens, or Cognito session strings; return generic errors to prevent user
  enumeration (spec FR-008, research Decision 8); rely on Cognito's own rate limiting rather than
  reimplementing it (spec Assumptions; the lockout-DoS risk is documented in
  `contracts/auth-routes.md`). PASS.
- **IV. Database Schema Evolution Discipline**: N/A — no schema changes in this feature.
- **V. Consistent API Contracts**: New routes follow the existing `ApiError`/
  `handleTopLevelCatch`/`validateOrThrow` conventions exactly (see `contracts/auth-routes.md`).
  PASS.
- **VI. Avoid Premature Abstraction**: The plan deliberately keeps `authorize()` narrow (research
  Decision 1) rather than building a generic "auth flow orchestrator," and reuses existing helpers
  (`checkIfUserExists`, `cognitoClient()`, `refreshAccessToken()`) rather than introducing new
  abstractions for things that already exist. PASS.
- **Technology Standards**: Uses only the established stack (Next.js App Router, MUI,
  `next-auth`, React Query, `class-validator`). The one new dependency (`aws-sdk-client-mock`) is a
  dev-only testing library, not an alternative framework/state-management/DB-access pattern, so it
  does not require the "documented justification" process the constitution reserves for those
  categories — it is documented here regardless, for transparency.

**Result**: PASS, with one documented, justified deviation (TDD-in-`api-tests/` for
Cognito-calling code — see Complexity Tracking).

## Project Structure

### Documentation (this feature)

```text
specs/003-custom-login-page/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md         # Phase 1 output
├── contracts/
│   └── auth-routes.md    # Phase 1 output
└── tasks.md              # Phase 2 output (/speckit-tasks — not created by this command)
```

### Source Code (repository root)

```text
app/
├── login/
│   └── page.tsx                            # NEW - sign-in / new-password / forgot-password view states
├── api/
│   ├── auth/
│   │   ├── [...nextauth]/route.ts          # UNCHANGED (thin NextAuth handler wrapper)
│   │   ├── sign-in/route.ts                # NEW - wraps InitiateAuthCommand
│   │   ├── respond-to-new-password-challenge/route.ts  # NEW - wraps RespondToAuthChallengeCommand
│   │   ├── forgot-password/route.ts        # NEW - wraps ForgotPasswordCommand
│   │   └── confirm-forgot-password/route.ts# NEW - wraps ConfirmForgotPasswordCommand
│   └── users/
│       ├── cognito-client.ts               # UNCHANGED (reused cognitoClient() singleton)
│       └── cognito-auth.ts                 # NEW - thin Cognito SDK wrappers + error mapping
app/
└── JanusAppbar.tsx                         # MODIFIED - render nothing on /login (usePathname)
components/
└── LoginRequired.tsx                       # MODIFIED - navigate to /login?callbackUrl=... instead of bare signIn()
lib/
├── auth.ts                                 # MODIFIED - CredentialsProvider, pages.signIn, jwt callback branch,
│                                            #            SDK-based refreshAccessToken, expires_at fix, session error
├── login-ticket.ts                         # NEW - encode/decode of the 60 s login ticket (next-auth/jwt)
├── dto.ts                                  # MODIFIED - add SignInRequest, RespondToNewPasswordChallengeRequest,
│                                            #            ForgotPasswordRequest, ConfirmForgotPasswordRequest
├── helpers-for-api.ts                      # MODIFIED - add ApiErrorTooManyRequests (429), 401 error class
└── routes.ts                               # MODIFIED - add API_AUTH_* route constants
types/                                      # MODIFIED - next-auth User/JWT/Session type augmentation
cloudformation.yaml                         # MODIFIED - add ALLOW_USER_PASSWORD_AUTH to JanusUserPoolClient
playwright/
└── auth.setup.ts                           # MODIFIED - same-origin /login locators instead of Cognito Hosted UI

app/api/auth/sign-in/route.test.ts                                   # NEW (mocked Cognito)
app/api/auth/respond-to-new-password-challenge/route.test.ts         # NEW (mocked Cognito)
app/api/auth/forgot-password/route.test.ts                           # NEW (mocked Cognito)
app/api/auth/confirm-forgot-password/route.test.ts                   # NEW (mocked Cognito)
lib/login-ticket.test.ts                                             # NEW (round trip, tampered, expired, wrong salt)
app/login/page.test.tsx                                              # NEW (React Testing Library, optional per constitution's "complex UI logic" trigger)
playwright/login.spec.ts                                             # NEW - UI state-machine coverage with page.route()-stubbed /api/auth/* routes
```

**Structure Decision**: Single Next.js application (existing structure), no new top-level
directories. New auth-related API routes are grouped under `app/api/auth/` (a new subdirectory,
alongside the existing `app/api/auth/[...nextauth]/`), and the Cognito SDK wrapper lives next to
the existing admin-operations wrapper in `app/api/users/` per research Decision 7. `/login` is a
new top-level route segment. The app bar is hidden there by a `usePathname()` check in
`JanusAppbar` (research Decision 15) — a nested layout cannot do this, because nested layouts
render inside the root layout.

## Complexity Tracking

| Violation                                                                                                                                                                                         | Why Needed                                                                                                                                                                                                                                                   | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| New API routes (`app/api/auth/*`) are NOT covered by `api-tests/` integration tests against real Postgres, deviating from Constitution Principle II's literal "tests in `api-tests/`" instruction | The Cognito interaction is the entire point of these routes; testing it meaningfully requires either real network calls to AWS Cognito or a mocked SDK client — neither of which is what `api-tests/`'s real-Postgres-integration-test model is designed for | Calling real Cognito from `api-tests/` was rejected: no local Cognito emulator exists in this repo's tooling, it would require provisioning and carefully resetting dedicated test users (some flows, like NEW_PASSWORD_REQUIRED, are single-use per user), and would make CI flaky/slow/network-dependent. This mirrors the codebase's own existing, unwritten precedent: today's only Cognito-writing routes (`POST/PUT/DELETE /api/users`) are simply never exercised by `api-tests/` either. |
| New dev dependency `aws-sdk-client-mock`, not previously used in this repo                                                                                                                        | Needed to unit-test the four new Cognito-calling routes without hitting real AWS, since no existing mocking pattern for `@aws-sdk/client-cognito-identity-provider` exists in the codebase                                                                   | Hand-rolling a mock via manual dependency injection into `cognitoClient()` was considered but rejected as reinventing a well-established, purpose-built library used across the AWS SDK v3 ecosystem, for no real benefit                                                                                                                                                                                                                                                                        |

## Phase 0 & 1 Outputs

- [research.md](./research.md) — 16 documented decisions covering routing architecture, infra
  change, RBAC/groups handling, token refresh (fix, not reuse), backend-user check, error
  handling/enumeration prevention, form library choice, entry-point wiring, NextAuth `pages`
  config, E2E test updates, testing strategy, the login-ticket security design, app-chrome
  suppression and return-to-page handling.
- [data-model.md](./data-model.md) — client-side view state shape and Cognito-managed transient
  concepts (no persisted entities).
- [contracts/auth-routes.md](./contracts/auth-routes.md) — full request/response contracts for the
  four new API routes.
- [quickstart.md](./quickstart.md) — manual and automated verification steps per user story.

## Post-Design Constitution Re-Check

Re-reviewed after Phase 1 design: no new violations introduced beyond the one already documented
in Complexity Tracking. The `/login` page reuses the existing global provider tree
(`app/JanusProviders.tsx`) with no new providers needed (confirmed in research). The login
ticket (research Decision 14) reuses `next-auth/jwt` `encode`/`decode`, already in the dependency
tree, and adds no new library. The one new provider-level piece is a small client effect that
signs the user out when a token refresh fails (task T005c). PASS.
