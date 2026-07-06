# Feature Specification: Compensate (Bursar Workflow)

**Feature Branch**: `002-compensate-bursar-workflow`

**Created**: 2026-06-19

**Status**: Draft (documenting an existing feature)

**Input**: User description: "Describe what the Bursar does on the /compensate page."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Issue bank transfers for outstanding approved trainings (Priority: P1)

The Bursar opens the compensation page to settle the trainings that the Approver has approved but
that have not yet been paid out. The system gathers all approved-but-unpaid trainings, groups them
by trainer and course so that one bank transfer per group is produced, and shows the totals the
Bursar is about to pay. The Bursar reviews the list, generates a SEPA XML file, imports that file
into the external bank tool (StarMoney) to execute the transfers, and then marks everything as
compensated inside the application so the same trainings cannot be paid twice.

**Why this priority**: This is the core reason the page exists. Without it the club cannot pay its
trainers, and trainings would pile up in the "approved" bucket forever. Everything else on the page
exists to support, review, or audit this single act.

**Independent Test**: With a set of approved-but-unpaid trainings in the system, the Bursar can
open the page, see the list of outstanding compensations, download a SEPA XML, mark the batch as
compensated, and observe that the same trainings no longer appear in the outstanding list and that
a new historical payment entry exists.

**Acceptance Scenarios**:

1. **Given** there are approved trainings that have not yet been compensated, **When** the Bursar
   opens the compensation page, **Then** the system pre-selects the "Outstanding" view and lists
   one row per trainer/course combination with the trainer name, course name, cost center, number
   of trainings included, total amount in euros, and the trainer's IBAN.
2. **Given** the Bursar is viewing the outstanding list with no per-trainer filter applied,
   **When** the Bursar requests a SEPA XML, **Then** the system produces a downloadable XML file
   that contains one credit transfer per row, addressed to the trainer's IBAN, for the displayed
   amount, suitable for import into the club's bank software.
3. **Given** the Bursar has already executed the bank transfers externally, **When** the Bursar
   clicks "Mark all as transferred" on the outstanding view, **Then** the system records a new
   historical payment grouping the included trainings, removes those trainings from the
   outstanding list, and they no longer appear when the Bursar reopens the page.
4. **Given** at least one trainer in the outstanding list has no IBAN on file, **When** the
   Bursar tries to mark the batch as transferred, **Then** the system refuses the operation and
   tells the Bursar which trainer is missing an IBAN, so the outstanding list is preserved
   untouched.

---

### User Story 2 - Investigate a single trainer's outstanding compensation (Priority: P2)

The Bursar often gets questions from trainers ("how much will I receive this month?", "why is this
amount what it is?") or needs to double-check an unusually large compensation before paying it.
The Bursar can narrow the view to one trainer to see only that trainer's outstanding rows, and
from any row jump straight into the approval view filtered to the exact period and trainer to
inspect the individual training sessions that make up the total.

**Why this priority**: It is a frequent supporting task — the Bursar uses it before signing off
on the batch, when answering trainer questions, and when spot-checking what the Approver has
forwarded. It does not block running a payment cycle (the Bursar can still pay everyone without
ever filtering), but without it auditability and trust in the totals suffer significantly.

**Independent Test**: With multiple trainers having outstanding compensations, the Bursar selects
one trainer from the dropdown, sees only that trainer's rows in the table, clicks the inspect
action on a row, and lands on the approval view scoped to that trainer and the row's date range.

**Acceptance Scenarios**:

1. **Given** several trainers have outstanding compensations, **When** the Bursar picks a trainer
   in the trainer dropdown, **Then** the table shows only rows for that trainer and the totals
   reflect only that trainer's compensations.
2. **Given** the Bursar has filtered the table to a single trainer, **When** the Bursar uses the
   inspect action on a row, **Then** the application navigates to the approval view pre-filtered
   to that trainer and the row's start and end dates so that the individual training sessions
   behind the compensation can be reviewed.
3. **Given** a trainer filter is active, **When** the Bursar looks at the action buttons,
   **Then** the SEPA generation and "mark as transferred" actions are unavailable, preventing a
   partial payout that would corrupt the batch.

---

### User Story 3 - Review and audit a past payment (Priority: P3)

After a payout has been done the Bursar (and auditors) need to look back at what was paid, when,
to whom, for what trainings, and at what IBAN. The list of historical payments — labelled with
the creation date and total amount — lets the Bursar select any past payment and inspect the
exact compensations it covered, using the IBAN that was valid at the time of payment rather than
whatever IBAN the trainer happens to have today.

**Why this priority**: It is not needed to run the next payout cycle, but it is essential for
bookkeeping, for answering "did we already pay X?" questions, and for end-of-year reconciliations.

**Independent Test**: With at least one historical payment in the system, the Bursar selects it
from the payment list and observes a read-only compensation table showing exactly the rows that
were paid, with the IBANs that were used at the time.

**Acceptance Scenarios**:

1. **Given** historical payments exist, **When** the Bursar opens the page, **Then** the payment
   list shows the "Outstanding" entry plus one entry per past payment, labelled with the payment
   date and total amount, ordered with the most recent first.
2. **Given** the Bursar selects a past payment, **When** the compensation table loads, **Then**
   it shows the trainer/course rows that were included in that payment, each with the IBAN that
   was captured at the moment that payment was created (not necessarily the trainer's current
   IBAN).
3. **Given** the Bursar is viewing a past payment, **When** looking at the action buttons,
   **Then** the "mark as transferred" action is unavailable because the payment is already final.

---

### User Story 4 - Restrict the view to a chosen year (Priority: P3)

Over time the list of historical payments grows. The Bursar selects a year (defaulting to the
current year, with the previous five years also available) to keep the payment list focused on a
manageable, business-meaningful window — typically the current fiscal year.

**Why this priority**: A quality-of-life filter. The page is usable without it, but it becomes
cluttered after a few years of operation; restricting the view also aligns with how the club
thinks about payouts (per calendar year).

**Acceptance Scenarios**:

1. **Given** the Bursar opens the page, **When** the page first loads, **Then** the current
   calendar year is pre-selected and only payments created within that year appear in the payment
   list.
2. **Given** the Bursar changes the year selection, **When** the list refreshes, **Then** only
   payments created within the chosen year are shown, while the "Outstanding" entry remains
   visible regardless of year.

---

### User Story 5 - Export the compensation table for offline use (Priority: P3)

The Bursar sometimes needs to share or archive the contents of a compensation table outside the
application — for example, to attach to an accounting record or send to the treasurer. The table
can be exported as a CSV file with a date-stamped filename so the export can be filed without
manual renaming.

**Acceptance Scenarios**:

1. **Given** the Bursar is viewing any compensation table (outstanding or historical), **When**
   the Bursar triggers the CSV export from the table toolbar, **Then** a CSV file is downloaded
   whose name contains the current date and the word "Pauschalen-Export".

---

### Edge Cases

- **Trainer without IBAN in the outstanding batch**: marking as transferred is refused with a
  message naming the affected trainer(s); the Bursar must have the missing IBAN entered (in the
  trainer's profile) before retrying. No partial payment is recorded.
- **Compensation row with zero or negative total**: both the SEPA generation and the
  mark-as-transferred actions are refused with an error that lists the offending trainer/course
  rows, so the Bursar can ask the Approver to fix the underlying training before retrying.
- **Empty outstanding list**: the table is empty and the action buttons remain visible but yield
  no useful output; the Bursar simply has nothing to pay this cycle.
- **Trainer's IBAN changes between payments**: a payment that was issued last month must keep
  showing the IBAN that was used at that time, even after the trainer updates their IBAN today.
- **Trainer filter active**: the bulk SEPA and mark-as-transferred actions are intentionally
  disabled to prevent paying only one trainer out of a planned batch and leaving the rest in an
  inconsistent state.
- **Past payment selected**: the mark-as-transferred action is disabled because the batch is
  already final; only inspection and export remain available.
- **Concurrent Bursars**: the application is used by a small office team; the workflow assumes
  the Bursar role is exercised by a single person at a time and does not provide explicit
  locking — once a batch has been marked as transferred, a second Bursar opening the page would
  simply see an empty outstanding list.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The system MUST restrict access to the compensation page to users in the Bursar
  role (which in this application is currently the same group as the Approver, for compliance
  reasons noted in the user documentation).
- **FR-002**: The system MUST present, by default, the list of outstanding compensations: every
  approved training that has not yet been included in a payment.
- **FR-003**: The system MUST group outstanding (and historical) compensations into one row per
  trainer and course, summarising the number of included trainings, the total amount, the cost
  center, the trainer's name, the course name, and the IBAN that applies to that row.
- **FR-004**: The system MUST allow the Bursar to filter the visible list to a single trainer.
- **FR-005**: The system MUST allow the Bursar to filter the visible payments to a single
  calendar year, defaulting to the current calendar year and offering at least the current year
  plus the previous five years.
- **FR-006**: The system MUST allow the Bursar to drill from any compensation row into the
  approval view, pre-filtered to the same trainer and the same date range, so the individual
  trainings can be inspected.
- **FR-007**: The system MUST allow the Bursar to download a SEPA-formatted credit-transfer file
  containing one transfer per row in the currently displayed compensation table, suitable for
  import into the club's bank software (StarMoney).
- **FR-008**: The system MUST disable SEPA file generation whenever a single-trainer filter is
  active, because the intended scope of a SEPA file is a full payment batch.
- **FR-009**: The system MUST allow the Bursar, while viewing the outstanding list with no
  trainer filter applied, to mark all currently outstanding compensations as transferred in a
  single action.
- **FR-010**: The system MUST disable the "mark as transferred" action whenever a historical
  payment is being viewed or a trainer filter is active.
- **FR-011**: When the Bursar marks a batch as transferred, the system MUST atomically (a) record
  a new historical payment dated to the moment of the action, (b) capture for that payment the
  IBAN currently on file for each included trainer, and (c) move the included trainings out of
  the outstanding pool so they cannot be paid again.
- **FR-012**: The system MUST refuse to create a payment if any included trainer is missing an
  IBAN, and MUST tell the Bursar which trainers are affected.
- **FR-013**: The system MUST refuse to generate a SEPA file or mark as transferred when any row
  in the current view has a zero or negative total, and MUST identify the affected rows so the
  Bursar knows what to escalate to the Approver.
- **FR-014**: The system MUST list every historical payment for the selected year, showing the
  payment's creation date and total amount, ordered most-recent first, alongside an always-
  present "Outstanding" entry.
- **FR-015**: When the Bursar selects a historical payment, the system MUST show the trainer/
  course rows that were part of that payment, using for each row the IBAN that was captured at
  the time the payment was created, not the trainer's current IBAN.
- **FR-016**: The system MUST allow the Bursar to export the currently displayed compensation
  table as a CSV file with a filename that includes the current date.
- **FR-017**: The system MUST format all monetary amounts in euros and all IBANs in a
  human-readable grouped form for display.

### Key Entities _(include if feature involves data)_

- **Approved Training**: A single training session that has been entered by a trainer and
  approved by the Approver but not yet paid. Becomes part of a compensation row until it is
  included in a payment.
- **Compensation Row**: A view-model summarising, for one trainer and one course over a date
  range, the number of trainings included, the total amount owed, the applicable cost center,
  and the IBAN to use for the transfer.
- **Payment**: A historical record of one payout cycle. Has a creation timestamp, an aggregate
  total, references to every training it covers, and a captured per-trainer IBAN snapshot
  representing the IBAN used at the moment the payment was issued.
- **Trainer IBAN Snapshot**: For each trainer included in a payment, the IBAN that was on file
  for that trainer at the moment the payment was created. Used for displaying historical
  payments so that subsequent changes to the trainer's IBAN do not rewrite history.
- **Cost Center**: The budget bucket against which a compensation is charged; surfaced in the
  table so the Bursar (and auditors) can see how the payout splits across budgets.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: From opening the page to a SEPA file being downloaded for the full outstanding
  batch, the Bursar can complete the action in under 60 seconds when no exceptions need
  resolving.
- **SC-002**: Once a batch has been marked as transferred, 0 of the included trainings ever
  reappear in the outstanding list without explicit administrative action.
- **SC-003**: 100% of historical payment views show, for each row, the IBAN that was captured at
  the time of payment — never the trainer's current IBAN if it has changed since.
- **SC-004**: The Bursar can correctly identify the underlying training sessions for any
  compensation row in at most 2 interactions (filter to trainer if needed, then drill into the
  approval view).
- **SC-005**: 0 payments are ever created that include a trainer without an IBAN on file.
- **SC-006**: 0 payments are ever created that include a row with a zero or negative amount.
- **SC-007**: Each downloaded SEPA file is accepted by the external bank software (StarMoney)
  without manual editing.

## Assumptions

- The Bursar role and the Approver role are technically the same authorisation group in this
  application (both are "admins"); the separation between the two roles is organisational and
  procedural, not enforced by the software. This matches the existing user documentation.
- "Outstanding compensations" means: every training in the approved-but-not-yet-paid state,
  regardless of when it was given, with no automatic cut-off based on the selected year. The
  year filter applies only to the list of historical payments.
- A row's "IBAN" for outstanding rows is the trainer's current IBAN; for historical-payment
  rows it is the snapshot taken when that payment was created.
- The SEPA file targets the SEPA credit-transfer format expected by the club's bank tool
  (StarMoney) and uses the club's bank account as the debtor. The exact debtor account and
  format version are configuration concerns and are out of scope for this specification.
- The trainer drop-down lists all users with the trainer role; the page does not restrict it
  further (for example to "only trainers who have outstanding compensations").
- Concurrency safeguards beyond what the database provides (e.g., explicit Bursar locks) are
  not required, because the role is exercised by a small office team and the existing single-
  action atomic mark-as-transferred is sufficient in practice.
- The page is used on desktop PCs in the club office; no mobile-specific behaviour is in scope.
