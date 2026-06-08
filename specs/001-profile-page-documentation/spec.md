# Feature Specification: User Profile Page

**Feature Branch**: `speckit`

**Created**: 2026-05-22

**Status**: Documentation (Existing Feature)

**Input**: User description: "Document the existing profile page that is available under /profile"

## Clarifications

### Session 2026-05-22

- Q: What level of IBAN validation should be performed? → A: Format + checksum validation (IBAN mod-97 algorithm)
- Q: How specific should IBAN validation error messages be to users? → A: User-friendly generic categories (e.g., "Invalid IBAN format" for validation failures, "System error" for server issues)
- Q: How should the system handle concurrent IBAN updates for the same user? → A: Last-write-wins (accept the most recent update without conflict detection)

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Personal Information (Priority: P1)

Users need to view and verify their basic profile information to ensure the system has correct data for training tracking and compensation.

**Why this priority**: Core functionality that all users (trainers and admins) need to access their profile data and verify accuracy for payment processing.

**Independent Test**: User can navigate to /profile and view all their stored personal information including name, email, group membership, IBAN, and compensation class assignments.

**Acceptance Scenarios**:

1. **Given** an authenticated user accesses the profile page, **When** the page loads, **Then** their name, email, and group membership are displayed in read-only text fields
2. **Given** a user with an IBAN on file, **When** viewing the profile, **Then** the IBAN is displayed in a human-readable format
3. **Given** a user without an IBAN, **When** viewing the profile, **Then** the IBAN field displays "keine IBAN angegeben"
4. **Given** a user assigned to compensation classes, **When** viewing the profile, **Then** all assigned compensation class names are displayed
5. **Given** a user with no compensation classes, **When** viewing the profile, **Then** the compensation classes field displays "keine"

---

### User Story 2 - Update IBAN for Payment Processing (Priority: P1)

Trainers must be able to update their IBAN to ensure they receive compensation payments to the correct bank account.

**Why this priority**: Critical for payment processing - trainers cannot be compensated without a valid IBAN on file.

**Independent Test**: User can click the edit icon on the IBAN field, enter a new IBAN in a dialog, and successfully save it. The updated IBAN is immediately visible on the profile page.

**Acceptance Scenarios**:

1. **Given** a user clicks the edit icon on the IBAN field, **When** the edit dialog opens, **Then** a dialog appears with the current IBAN pre-filled
2. **Given** a user enters a valid IBAN in the dialog, **When** they confirm the change, **Then** the IBAN is updated and a success message is displayed
3. **Given** the IBAN update succeeds, **When** the dialog closes, **Then** the updated IBAN is immediately visible on the profile page
4. **Given** the IBAN update fails, **When** the error occurs, **Then** an error message is displayed explaining the failure

---

### User Story 3 - View Assigned Training Courses (Priority: P2)

Trainers need to see which courses they are authorized to teach so they can enter trainings only for courses they are qualified for.

**Why this priority**: Important for trainers to understand their teaching authorization but doesn't block basic profile viewing or IBAN updates.

**Independent Test**: User can view a list of all courses they are assigned to teach, displayed as course cards with relevant course details.

**Acceptance Scenarios**:

1. **Given** a trainer with assigned courses, **When** viewing the profile, **Then** all assigned courses are displayed as course cards under the "Kurse" section
2. **Given** a trainer with no assigned courses, **When** viewing the profile, **Then** the message "Keine Kurse hinterlegt" is displayed
3. **Given** multiple courses are assigned, **When** viewing the profile, **Then** each course appears as a separate card with course details

---

### User Story 4 - Access Terms of Service (Priority: P3)

Users should be able to review the terms of service (AGBs) at any time to understand their rights and obligations.

**Why this priority**: Legal requirement but not blocking any critical workflows. Users typically view this during onboarding, not frequently from the profile.

**Independent Test**: User can click "AGBs anzeigen" button to open a dialog displaying the current terms of service.

**Acceptance Scenarios**:

1. **Given** a user clicks the "AGBs anzeigen" button, **When** the button is activated, **Then** a dialog opens displaying the terms of service content
2. **Given** the terms of service dialog is open, **When** the user closes the dialog, **Then** the dialog dismisses and returns to the profile view
3. **Given** the system cannot load terms of service, **When** the error occurs, **Then** an appropriate error message is displayed

---

### User Story 5 - Logout from Profile (Priority: P2)

Users need the ability to securely end their authenticated session when finished using the application.

**Why this priority**: Security best practice and user expectation, but not blocking core profile functionality.

**Independent Test**: User can click the "Ausloggen" button and be logged out of their session.

**Acceptance Scenarios**:

1. **Given** an authenticated user clicks "Ausloggen", **When** the logout completes successfully, **Then** the user session is terminated and they are redirected to the login page
2. **Given** the logout process encounters an error, **When** the error occurs, **Then** the error is logged for debugging purposes

---

### Edge Cases

- What happens when a user has an empty groups array? The system displays "Keine Gruppen" to handle this edge case gracefully.
- How does the system handle concurrent IBAN updates? The system uses a last-write-wins strategy - the most recent update is accepted without conflict detection. The mutation invalidates the query cache after success to ensure the latest data is displayed.
- What if the terms of service file is missing? The query will fail and should display an error message to the user.
- What if course data fails to load? The system displays an appropriate error state to inform the user of the loading failure.
- What if the user is not authenticated? The LoginRequired component handles this by showing the appropriate authentication status message.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST display the authenticated user's name in a read-only field
- **FR-002**: System MUST display the authenticated user's email address in a read-only field
- **FR-003**: System MUST display the user's group membership (trainers, admins, or both) in human-readable format
- **FR-004**: System MUST display the user's IBAN in human-readable format or "keine IBAN angegeben" if not set
- **FR-005**: System MUST provide an edit button on the IBAN field to allow users to update their IBAN
- **FR-006**: System MUST validate IBAN updates using format validation (country code and length) and checksum validation (IBAN mod-97 algorithm) before saving when a user submits the edit dialog
- **FR-007**: System MUST display a success notification when IBAN is updated successfully
- **FR-008**: System MUST display an error notification when IBAN update fails, using user-friendly generic categories (e.g., "Invalid IBAN format" for validation failures, "System error, please try again" for server issues)
- **FR-009**: System MUST display all compensation classes assigned to the user or "keine" if none assigned
- **FR-010**: System MUST display all courses assigned to the user as trainable courses
- **FR-011**: System MUST display "Keine Kurse hinterlegt" when user has no assigned courses
- **FR-012**: System MUST provide a button to view the terms of service in a dialog
- **FR-013**: System MUST load and display the terms of service content from /terms-and-conditions.md
- **FR-014**: System MUST provide a logout button that terminates the user's session
- **FR-015**: System MUST require authentication to access the profile page
- **FR-016**: System MUST display a loading indicator while authentication status is being determined
- **FR-017**: System MUST refresh the displayed user data after IBAN update to show the latest value
- **FR-018**: System MUST use last-write-wins strategy for concurrent IBAN updates, accepting the most recent update without conflict detection

### Key Entities

- **User**: Represents the authenticated user with personal information (name, email, IBAN), group membership, and assigned compensation classes. Linked to courses they can teach.
- **Course**: Represents a training course that a trainer is authorized to conduct. Contains course details displayed in course cards.
- **Group**: User role membership (trainers, admins) that determines access permissions.
- **CompensationClass**: Categories that define compensation rates for trainers based on their qualifications.
- **Terms of Service**: Legal document containing the application's terms and conditions that users can review.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can view all their profile information within 2 seconds of page load
- **SC-002**: IBAN updates complete within 3 seconds under normal network conditions
- **SC-003**: 100% of authenticated users can successfully access their profile page
- **SC-004**: Users can update their IBAN without needing technical support
- **SC-005**: Profile page is accessible to both trainers and admins regardless of group membership
- **SC-006**: Users receive immediate visual feedback (success/error notification) after IBAN update attempts
- **SC-007**: Course list accurately reflects the trainer's current course assignments from the database

## Assumptions

- Users have stable internet connectivity when accessing the profile page
- Authentication is handled by AWS Cognito and users are already authenticated when accessing /profile
- User data (name, email, groups) is synchronized between Cognito and the database
- IBAN validation is performed on the server side via the PATCH /api/users endpoint
- Course assignments are managed separately through admin interfaces and are read-only on the profile
- The terms of service file exists at /public/terms-and-conditions.md or equivalent public path
- Compensation class assignments are managed by admins and are read-only for users viewing their profile
- Group membership display handles the edge case of empty groups array (as reported by Beate Kubny)
- Mobile responsiveness is important for trainers but desktop view is primary for this page
