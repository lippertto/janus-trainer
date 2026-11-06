# API Contracts: Custom-Branded Login Page

All routes follow the existing codebase conventions from `lib/helpers-for-api.ts`:
`handleTopLevelCatch()` for uniform error responses, `ApiError` subclasses for typed errors,
`NextResponse.json({ value: ... })` for success (adapted below per route), DTOs validated with
`validateOrThrow()` and `class-validator` decorators in `lib/dto.ts`.

**Status codes**: `ApiErrorUnauthorized` in `lib/helpers-for-api.ts` currently returns **403**, not
401, and there is no 429 class. This feature changes `ApiErrorUnauthorized` to **401** only if an
audit of existing callers/tests shows nothing depends on 403; otherwise it adds
`ApiErrorInvalidCredentials` (401) alongside a new `ApiErrorTooManyRequests` (429, code
`TooManyRequests`). Task T004a covers this. The codes below are the intended wire contract.

None of these routes require an `Authorization: Bearer <token>` header — they are all
**pre-authentication** endpoints, analogous to how `allowNoOne`/public routes are structured
today, except these are intentionally public (rate limiting is delegated to Cognito, per research
Decision 8 / spec Assumptions).

---

## POST /api/auth/sign-in

Wraps `InitiateAuthCommand` with `AuthFlow: 'USER_PASSWORD_AUTH'`.

**Request body** (`SignInRequest` DTO):

```ts
{
  email: string; // @IsEmail()
  password: string; // @IsString() @IsNotEmpty()
}
```

**Success response — fully authenticated** (`200`):

```ts
{
  status: 'SUCCESS';
  ticket: string; // opaque, encrypted, 60 s lifetime — see research Decision 14
}
```

Cognito tokens are **never** returned to the browser. The `ticket` is a JWE created with
`encode()` from `next-auth/jwt` (dedicated salt, `maxAge: 60`) containing the claims and tokens
that `authorize()` needs.

**Success response — challenge required** (`200`):

```ts
{
  status: 'CHALLENGE';
  challengeName: 'NEW_PASSWORD_REQUIRED';
  session: string; // opaque Cognito session token
  challengeUsername: string; // Cognito's USER_ID_FOR_SRP, echoed back by the client
}
```

**Error responses**:

- `400 BadRequest` — validation failure (missing/malformed email or password).
- `401 Unauthorized` — Cognito `NotAuthorizedException` (covers both wrong password AND
  nonexistent user, per `PreventUserExistenceErrors: ENABLED`). Message: "E-Mail oder Passwort ist
  falsch."
- `429 TooManyRequests` — Cognito `TooManyRequestsException` / `LimitExceededException`. Message:
  "Zu viele Versuche, bitte später erneut versuchen."
- `500 InternalServerError` — unexpected Cognito/infra error.

**Note**: On `status: 'SUCCESS'`, the client is **not** signed in yet — it must call
`signIn('credentials', { redirect: false, ticket })`. `authorize()` decrypts and validates the
ticket (returns `null` if tampered/expired) and NextAuth then runs the existing `signIn` callback,
which performs the backend-recognition check (`checkIfUserExists(sub)`). If that check fails,
`signIn()` resolves with `{ error: 'AccessDenied' }` and the page shows a German message
(research Decision 5). The sign-in route itself does **not** perform that check.

---

## POST /api/auth/respond-to-new-password-challenge

Wraps `RespondToAuthChallengeCommand` with `ChallengeName: 'NEW_PASSWORD_REQUIRED'`.

**Request body** (`RespondToNewPasswordChallengeRequest` DTO):

```ts
{
  email: string; // @IsEmail() - used only as fallback; see note below
  newPassword: string; // @IsString() @IsNotEmpty() - no length rule here; Cognito's pool policy is authoritative
  session: string; // @IsString() @IsNotEmpty() - opaque token from the sign-in response
}
```

The sign-in route returns `{ status: 'CHALLENGE', ..., session, challengeUsername }` where
`challengeUsername` is `ChallengeParameters.USER_ID_FOR_SRP` from Cognito; the page echoes it
back and the route uses it as `USERNAME` in `RespondToAuthChallengeCommand` (not the typed email).
Also verify during implementation whether `requiredAttributes` need to be supplied; the pool
requires none beyond what `AdminCreateUser` sets, so none are expected.

**Success response** (`200`): same shape as sign-in's `status: 'SUCCESS'` response above
(`{ status: 'SUCCESS', ticket }`).

**Error responses**:

- `400 BadRequest` — validation failure.
- `400 BadRequest` (`errorCode: 'InvalidPassword'`) — Cognito `InvalidPasswordException` (new
  password fails the pool's password policy). Message is a generic German "password does not meet
  the requirements" text followed by Cognito's own detail message when present. Requirements are
  **not** hardcoded in the app; the pool's policy is the single source of truth.
- `401 Unauthorized` — Cognito `NotAuthorizedException` (session token expired/invalid — the ~3–5
  minute window elapsed). Message instructs the user to restart the sign-in flow.
- `429 TooManyRequests` — `TooManyFailedAttemptsException` / `LimitExceededException`.
- `500 InternalServerError` — unexpected error.

Same "not signed in yet" note as above applies: the client must follow up with
`signIn('credentials', { redirect: false, ticket })`.

---

## POST /api/auth/forgot-password

Wraps `ForgotPasswordCommand`.

**Request body** (`ForgotPasswordRequest` DTO):

```ts
{
  email: string; // @IsEmail()
}
```

**Success response** (`200`), returned **unconditionally** regardless of whether the account
exists (research Decision 8 / spec FR-008):

```ts
{
  status: 'CODE_SENT';
}
```

**Implementation note**: With `PreventUserExistenceErrors: ENABLED`, Cognito already returns a
fake `CodeDeliveryDetails` for unknown users, so the route MUST NOT blanket-swallow
`InvalidParameterException` / `UserNotFoundException` — only the specific "unknown user" shapes
observed in the unit tests/test pool. Behavior for users still in `FORCE_CHANGE_PASSWORD` status
(never completed first login) must be checked manually; if Cognito raises `InvalidParameterException`
for them, the route returns `CODE_SENT` as well.

**Error responses** (only for genuine infra/service failures, never for "account not found"):

- `400 BadRequest` — validation failure (malformed email).
- `429 TooManyRequests` — `LimitExceededException` / `TooManyRequestsException`. Note: because
  Cognito only throws these for real accounts, a 429 here is a small enumeration side channel; it
  is accepted, but the route SHOULD return the same `CODE_SENT` for `LimitExceededException` and
  rely on the user retrying, to keep FR-008 intact.
- `500 InternalServerError` — unexpected error (including `CodeDeliveryFailureException`, which is
  a real infra problem worth surfacing distinctly from "account not found").

---

## POST /api/auth/confirm-forgot-password

Wraps `ConfirmForgotPasswordCommand`.

**Request body** (`ConfirmForgotPasswordRequest` DTO):

```ts
{
  email: string; // @IsEmail()
  confirmationCode: string; // @IsString() @IsNotEmpty()
  newPassword: string; // @IsString() @IsNotEmpty() - Cognito's pool policy is authoritative
}
```

**Success response** (`200`):

```ts
{
  status: 'PASSWORD_RESET';
}
```

**Error responses**:

- `400 BadRequest` — validation failure.
- `400 BadRequest` (`errorCode: 'CodeMismatch'`) — Cognito `CodeMismatchException`. Message: "Der
  Code ist falsch."
- `400 BadRequest` (`errorCode: 'CodeExpired'`) — Cognito `ExpiredCodeException`. Message: "Der
  Code ist abgelaufen, bitte fordere einen neuen an."
- `400 BadRequest` (`errorCode: 'InvalidPassword'`) — Cognito `InvalidPasswordException`.
- `429 TooManyRequests` — `TooManyFailedAttemptsException` / `LimitExceededException`.
- `500 InternalServerError` — unexpected error.

After success, the client returns the user to the `sign-in` view state; it does **not**
automatically sign the user in (Cognito's `ConfirmForgotPasswordCommand` does not return tokens),
matching how a "reset your password" flow conventionally requires a fresh, explicit sign-in
afterward.

---

## Abuse protection

All Cognito calls now originate from the server's IP, so Cognito's per-IP throttling no longer
distinguishes attackers, and Cognito's per-user lockout (`TooManyFailedAttemptsException`) can be
triggered by anyone against any known email (lockout DoS). This is accepted for the initial
release (small, invitation-only user base, `AllowAdminCreateUserOnly: True`), and noted as a
known risk. Follow-up if needed: a lightweight in-memory per-IP + per-email throttle in front of
`sign-in`.

---

## Error Response Shape (shared, existing convention)

All error responses use the existing `ErrorDto` shape from `lib/dto.ts` /
`lib/helpers-for-api.ts`:

```ts
{
  error: {
    message: string; // German, user-facing
    code: string; // e.g. 'BadRequest', 'Unauthorized', 'InvalidPassword', 'CodeMismatch', ...
  }
}
```
