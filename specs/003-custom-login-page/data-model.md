# Phase 1 Data Model: Custom-Branded Login Page

This feature introduces no new Prisma models and no database schema changes. Cognito remains the
sole store for user identities, passwords, and group membership (per spec Assumptions and
research Decision 3/5). The "entities" below are transient, in-memory/client-side or
Cognito-managed concepts, not persisted rows.

## Client-Side View State (`app/login/page.tsx`)

A discriminated union tracked in component state, determining which form is rendered:

```ts
type LoginViewState =
  | { step: 'sign-in' }
  | { step: 'new-password-required'; email: string; cognitoSession: string }
  | { step: 'forgot-password-request' }
  | { step: 'forgot-password-confirm'; email: string };
```

- `sign-in`: default state. Email + password fields.
- `new-password-required`: entered after the sign-in API route reports Cognito's
  `NEW_PASSWORD_REQUIRED` challenge. Carries the `email` and the opaque Cognito `Session` token
  needed to complete `RespondToAuthChallengeCommand`. New password + confirm-new-password fields.
- `forgot-password-request`: entered when the user clicks "forgot password" from `sign-in`. Email
  field only.
- `forgot-password-confirm`: entered after a reset code has been requested. Carries `email`.
  Verification code + new password + confirm-new-password fields.

No state is persisted beyond the current page lifecycle; a full page reload restarts at
`sign-in` (per spec Edge Cases: "session expires while filling out ... forms" → user restarts the
flow).

## Cognito-Managed Concepts (not modeled in this app's database)

- **Cognito Auth Session Token** (`InitiateAuthResponse.Session` /
  `RespondToAuthChallengeResponse.Session`): an opaque, short-lived (~3–5 minute) string issued by
  Cognito when a challenge (`NEW_PASSWORD_REQUIRED`) must be resolved before authentication
  completes. Passed from our sign-in API route to the client, held in the `new-password-required`
  view state, and sent back unmodified to the challenge-response API route. Never persisted;
  never logged.
- **Cognito Password Reset Code**: an opaque code Cognito emails to the user after
  `ForgotPasswordCommand`. Entered by the user on the `forgot-password-confirm` form and sent to
  `ConfirmForgotPasswordCommand`. Not generated, validated, or stored by this application — Cognito
  owns its lifecycle (issuance, expiry ~1 hour, single confirmation attempt tracking).
- **Cognito ID/Access/Refresh Tokens**: produced by `AuthenticationResult` once sign-in fully
  succeeds (either directly from `InitiateAuthCommand` for users with no pending challenge, or
  from `RespondToAuthChallengeCommand` after a `NEW_PASSWORD_REQUIRED` challenge is resolved).
  These are handed to NextAuth's `CredentialsProvider.authorize()` to mint the existing
  `JanusSession` (`lib/auth.ts`), exactly as the OAuth flow already does — no new persisted fields
  on `JanusSession`.

## API Route Request/Response Contracts

See `contracts/auth-routes.md` for the full request/response shapes of the four new API routes
(`sign-in`, `respond-to-new-password-challenge`, `forgot-password`, `confirm-forgot-password`).

## No Changes To

- `prisma/schema.prisma` — no new fields, tables, or migrations.
- `UserInDb` model — untouched; the existing `HEAD /api/users/{userId}` backend-recognition check
  (research Decision 5) is reused as-is.
- `JanusSession` interface (`lib/auth.ts`) — unchanged shape; only the `jwt` callback gains a
  branch to read `groups` from `user` instead of `profile` when `account.provider === 'credentials'`.
