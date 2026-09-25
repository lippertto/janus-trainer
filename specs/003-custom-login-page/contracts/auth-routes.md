# API Contracts: Custom-Branded Login Page

All routes follow the existing codebase conventions from `lib/helpers-for-api.ts`:
`handleTopLevelCatch()` for uniform error responses, `ApiError` subclasses for typed errors,
`NextResponse.json({ value: ... })` for success (adapted below per route), DTOs validated with
`validateOrThrow()` and `class-validator` decorators in `lib/dto.ts`.

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
  idToken: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

**Success response — challenge required** (`200`):

```ts
{
  status: 'CHALLENGE';
  challengeName: 'NEW_PASSWORD_REQUIRED';
  session: string; // opaque Cognito session token
}
```

**Error responses**:

- `400 BadRequest` — validation failure (missing/malformed email or password).
- `401 Unauthorized` — Cognito `NotAuthorizedException` (covers both wrong password AND
  nonexistent user, per `PreventUserExistenceErrors: ENABLED`). Message: "E-Mail oder Passwort ist
  falsch."
- `403 Forbidden` — the existing backend-recognition check fails (Cognito knows the user, our own
  `UserInDb` table does not — reuses `checkIfUserExists`). Message matches current behavior.
- `429 TooManyRequests` — Cognito `TooManyRequestsException` / `LimitExceededException`. Message:
  "Zu viele Versuche, bitte später erneut versuchen."
- `500 InternalServerError` — unexpected Cognito/infra error.

**Note**: On `status: 'SUCCESS'`, the client does **not** consider itself signed in yet — it must
still call `signIn('credentials', { redirect: false, idToken, accessToken, refreshToken, email })`
so that NextAuth's `authorize()` validates the tokens and establishes the actual `JanusSession`
(research Decision 1).

---

## POST /api/auth/respond-to-new-password-challenge

Wraps `RespondToAuthChallengeCommand` with `ChallengeName: 'NEW_PASSWORD_REQUIRED'`.

**Request body** (`RespondToNewPasswordChallengeRequest` DTO):

```ts
{
  email: string; // @IsEmail()
  newPassword: string; // @IsString() @MinLength(8)
  session: string; // @IsString() @IsNotEmpty() - opaque token from the sign-in response
}
```

**Success response** (`200`): same shape as sign-in's `status: 'SUCCESS'` response above.

**Error responses**:

- `400 BadRequest` — validation failure.
- `400 BadRequest` (`errorCode: 'InvalidPassword'`) — Cognito `InvalidPasswordException` (new
  password fails the pool's password policy). Message describes the requirement in German (min 8
  chars, upper/lower case, number, special character — Cognito's default policy).
- `401 Unauthorized` — Cognito `NotAuthorizedException` (session token expired/invalid — the ~3–5
  minute window elapsed). Message instructs the user to restart the sign-in flow.
- `429 TooManyRequests` — `TooManyFailedAttemptsException` / `LimitExceededException`.
- `500 InternalServerError` — unexpected error.

Same "not signed in yet" note as above applies: the client must follow up with
`signIn('credentials', ...)` using the returned tokens.

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

**Error responses** (only for genuine infra/service failures, never for "account not found"):

- `400 BadRequest` — validation failure (malformed email).
- `429 TooManyRequests` — `LimitExceededException` / `TooManyRequestsException`.
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
  newPassword: string; // @IsString() @MinLength(8)
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
