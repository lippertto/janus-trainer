# Feature Specification: Custom-Branded Login Page

**Feature Branch**: `003-custom-login-page`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Currently, the users get delegated to a generic cognito login page. I want to change that so that the login page matches the rest of the UI."

## Motivation

This feature is driven by two goals:

1. **User trust**: A sign-in screen that visually matches the rest of the application looks more
   legitimate and trustworthy to users than being suddenly redirected to an unfamiliar, generically
   styled page on a different domain — a pattern that can otherwise resemble phishing.
2. **Reduced coupling to the identity provider**: Today, the application's sign-in experience is
   directly dictated by the identity provider's own hosted UI. By presenting sign-in, first-time
   password change, and forgot-password entirely through the application's own interface, the
   application becomes free to change how or where it authenticates users in the future without
   that decision being visible to, or disruptive for, end users. This feature does not itself change
   the identity provider or where accounts/passwords are stored (see Assumptions) — it removes the
   _visual and navigational_ dependency on the identity provider's hosted UI, which is a
   prerequisite for any such change being possible later without a jarring user-facing shift.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Sign in without leaving the app's look and feel (Priority: P1)

A trainer or admin who is not yet signed in clicks "Anmelden" (sign in) somewhere in the app. Today
this sends them away to a generic, unbranded page hosted by AWS to enter their email and password.
Instead, they should stay within the application's visual style (same colors, typography, layout
conventions as the rest of Janus Trainer) while entering their credentials, and be returned to the
page they originally wanted after a successful sign-in.

**Why this priority**: This is the entire point of the feature. Every user encounters this page on
every session, so it is the single highest-visibility piece of UI in the app in terms of frequency
of exposure, and today it is the one screen that looks nothing like the rest of the product. Being
suddenly redirected to an unfamiliar, differently branded page to enter a password undermines user
trust; keeping the experience visually consistent reassures users they are still interacting with
the legitimate application.

**Independent Test**: Starting from a signed-out state, click the sign-in entry point, verify the
credential form is rendered using the app's own styling (not redirected to a different domain),
submit valid credentials, and confirm the user lands back in the app fully authenticated.

**Acceptance Scenarios**:

1. **Given** a signed-out user viewing any page that requires authentication, **When** they choose
   to sign in, **Then** they are shown a credential entry form styled consistently with the rest of
   the application, without navigating to a page hosted outside the app's own domain/UI.
2. **Given** the custom sign-in form, **When** the user enters a valid email and password, **Then**
   they are signed in and returned to the page or action they originally intended.
3. **Given** the custom sign-in form, **When** the user enters an incorrect email or password,
   **Then** the form shows an inline error message (styled like the rest of the app) without losing
   the entered email, and the user can retry without reloading a different page.

---

### User Story 2 - Complete first-time mandatory password change in the new UI (Priority: P2)

New trainers and admins are invited by an administrator and receive a temporary password by email.
The very first time they sign in, they are currently required to choose a new permanent password.
Today this mandatory step happens on the same generic AWS-hosted page. This step must also be
brought into the app's own UI so that a new user's entire first impression of signing in is
consistent with the rest of the product.

**Why this priority**: This is a real, unavoidable step for every newly invited user, so leaving it
on the old generic page would mean the branding problem still shows up for exactly the users who
are forming their first impression of the app (new trainers). However, it is a narrower audience
(new users only) than the everyday sign-in from User Story 1, so it is second priority.

**Independent Test**: Using a freshly invited account with only a temporary password, sign in with
that temporary password and verify the app (not an external page) prompts for a new permanent
password, accepts it, and signs the user in.

**Acceptance Scenarios**:

1. **Given** a newly invited user who has only ever received a temporary password, **When** they
   sign in with that temporary password, **Then** the app shows a "choose a new password" form
   styled consistently with the rest of the application (not an externally hosted page).
2. **Given** the "choose a new password" form, **When** the user submits a new password that meets
   the password requirements, **Then** their password is updated and they are signed in immediately
   without needing to sign in a second time.
3. **Given** the "choose a new password" form, **When** the user submits a new password that does
   not meet the password requirements, **Then** the form shows an inline error describing the
   requirement that was not met, and lets the user try again.

---

### User Story 3 - Recover access after forgetting a password (Priority: P3)

A user who has forgotten their password needs a self-service way to regain access without asking an
administrator to intervene. Today this self-service reset is available via a link on the generic
AWS-hosted page. This capability must be preserved, but presented as part of the app's own UI, so
that removing the old generic page does not remove any capability users currently rely on.

**Why this priority**: This is a less frequent event than everyday sign-in or first-time password
setup, but it must exist so that no existing self-service capability is lost when the old generic
page is retired.

**Independent Test**: From the sign-in form, choose "forgot password", supply the account's email,
retrieve the emailed verification code, and use it together with a new password to regain access,
confirming a subsequent sign-in with the new password succeeds.

**Acceptance Scenarios**:

1. **Given** a signed-out user on the custom sign-in form, **When** they indicate they forgot their
   password, **Then** they are shown a form (styled consistently with the rest of the app) asking
   for their email address, without leaving the app's own UI.
2. **Given** a user has requested a password reset for an email address with an account, **When**
   they submit the verification code they received together with a new password, **Then** their
   password is updated and they can subsequently sign in with the new password.
3. **Given** a user submits a forgot-password request for an email address that does not correspond
   to an account, **When** the request is submitted, **Then** the system responds the same way it
   would for a valid account (no confirmation or denial of whether the account exists), to avoid
   revealing which email addresses have accounts.
4. **Given** a user submits a verification code that is expired or incorrect, **When** they try to
   confirm the new password, **Then** the form shows an inline error and lets them request a new
   code.

### Edge Cases

- What happens when a user submits the sign-in form multiple times in quick succession (e.g.,
  double-clicking submit)? The form must not trigger duplicate sign-in attempts or show duplicate
  error messages.
- How does the system handle a user whose account exists in the identity provider but not yet in
  the application's own user records (the existing "backend does not recognize this user" check)?
  The existing rejection behavior and messaging for this case must be preserved.
- What happens if a user's session expires while they are filling out the first-time password
  change or forgot-password forms? They should see a clear message and be able to restart the flow
  from the beginning.
- How are excessive failed sign-in or password-reset attempts handled? The identity provider's
  existing throttling/lockout behavior continues to apply; the custom form must surface whatever
  throttling error is returned in a user-friendly way rather than a raw technical error.
- What happens to bookmarked links or in-progress sessions that point at the old generic sign-in
  page after it is retired? Out of scope for this feature to redirect old bookmarks; the entry
  points inside the application itself (e.g. the "Anmelden" button) are what must be updated.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST present a sign-in form that visually matches the rest of the
  application (shared layout, typography, color scheme, and component library) instead of
  redirecting the user to an externally hosted generic page.
- **FR-002**: The system MUST authenticate the email and password entered on the custom sign-in
  form against the same identity provider and user directory currently used for sign-in, without
  changing where user identities or passwords are stored.
- **FR-003**: The system MUST preserve the existing check that rejects sign-in for accounts that
  exist in the identity provider but are not recognized by the application's own backend, including
  equivalent messaging/behavior to what exists today.
- **FR-004**: The system MUST detect when a signing-in user is required to choose a new password
  (first-time mandatory password change) and present this step as an in-app form rather than an
  externally hosted page.
- **FR-005**: The system MUST allow a user completing the first-time mandatory password change to
  submit a new password and, upon success, be fully signed in without a separate manual sign-in
  step.
- **FR-006**: The system MUST provide a self-service "forgot password" entry point from the custom
  sign-in form, allowing a user to request a password reset by email, all within the app's own UI.
- **FR-007**: The system MUST let a user complete a password reset by submitting the verification
  code they receive together with a new password, and MUST allow subsequent sign-in with the new
  password.
- **FR-008**: The system MUST show the same response for a forgot-password request regardless of
  whether the submitted email corresponds to an existing account, to avoid revealing account
  existence.
- **FR-009**: The system MUST show clear, styled inline error messages (invalid credentials, weak
  password, expired/incorrect reset code, throttling) on all three forms (sign-in, first-time
  password change, forgot-password) without navigating away from the app.
- **FR-010**: After the custom sign-in flow is available, the system MUST no longer send users to
  the externally hosted generic sign-in page as part of any in-app sign-in entry point (e.g. the
  existing "Anmelden" button).
- **FR-011**: The system MUST return a successfully signed-in user to the page or action they
  originally intended to reach, matching current behavior.
- **FR-012**: The custom sign-in, first-time password change, and forgot-password forms MUST be
  usable on both mobile and desktop viewports, consistent with the rest of the application's
  responsive design.

### Key Entities

- **User Credential Session**: Represents an in-progress sign-in attempt, including which step of
  the flow the user is on (sign-in, mandatory password change, or forgot-password), and any
  identity-provider-issued challenge state needed to complete that step.
- **Password Reset Request**: Represents a user's request to reset a forgotten password, tracked by
  the identity provider via an email verification code, with a limited validity period.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: 100% of in-app sign-in entry points keep users within the application's own UI
  throughout sign-in, first-time password change, and forgot-password flows (zero navigations to an
  externally hosted generic identity page).
- **SC-002**: Users can go from clicking "sign in" to being authenticated in the app in under 30
  seconds under normal conditions (excluding time spent typing credentials), matching or improving
  on current sign-in speed.
- **SC-003**: 100% of currently supported self-service capabilities (standard sign-in, mandatory
  first-time password change, forgotten-password recovery) remain available after the old generic
  page is retired — no capability is lost.
- **SC-004**: New users invited to the application can complete their first sign-in and mandatory
  password change entirely within the app's own UI, without being told to expect a different-looking
  page mid-flow.
- **SC-005**: No page in the sign-in, first-time password change, or forgot-password flows exposes
  the identity provider's own hosted UI or requires a user-visible redirect to a different
  domain/branding — the application's front end owns the entire user-facing experience, so the
  identity provider could be swapped in the future without any visible change to these flows.

## Assumptions

- The identity provider and where user passwords/accounts are stored are not changing; only the
  user interface presented during sign-in changes.
- The existing password strength/complexity rules enforced by the identity provider remain
  unchanged; the custom forms surface whatever rules are already in effect today.
- The existing behavior of rejecting sign-in for users unknown to the application's own backend
  (while known to the identity provider) is preserved unchanged.
- Multi-factor authentication is not currently part of the sign-in flow and remains out of scope for
  this feature.
- Account creation/invitation (how a new user first receives a temporary password) is unchanged;
  this feature only affects what happens when a user with valid or temporary credentials attempts to
  sign in.
- Rate limiting/lockout behavior for repeated failed attempts is provided by the identity provider
  and is not being newly implemented by this feature; the custom forms only need to surface the
  resulting error clearly.
