# Feature: Historical IBAN Capture for Payments

## Overview

Capture and preserve trainer IBAN values at the time of payment creation to ensure payments are made to the correct account, even if trainers update their IBAN information later.

## Problem Statement

Previously, the system used the trainer's current IBAN value when generating SEPA payment files. This created a critical issue: if a trainer updated their IBAN after a payment was created but before the SEPA file was generated, the payment would be sent to the wrong account.

## User Story

**As a** financial administrator
**I want to** ensure payments are made to the IBAN that was active when the payment was approved
**So that** trainers receive compensation to the correct account regardless of later IBAN changes

## Functional Requirements

### FR-1: IBAN Validation on Payment Creation

The system SHALL validate that all trainers included in a payment have a non-NULL IBAN value before allowing payment creation.

**Acceptance Criteria:**

- Payment creation API rejects requests if any trainer has a NULL IBAN
- Error message includes the email addresses of trainers without IBANs
- HTTP 400 Bad Request status is returned

### FR-2: Historical IBAN Capture

When a payment is created, the system SHALL capture and store the current IBAN value for each unique trainer included in the payment.

**Acceptance Criteria:**

- One `PaymentUserIban` record is created per unique trainer in the payment
- The IBAN value is captured from the `User.iban` field at payment creation time
- If the same trainer has multiple trainings in one payment, only one `PaymentUserIban` record is created
- Records are linked to both the payment and the user

### FR-3: Historical IBAN Usage

When retrieving compensation data for an existing payment, the system SHALL use the historical IBAN value stored in `PaymentUserIban`, not the trainer's current IBAN.

**Acceptance Criteria:**

- Compensation queries for existing payments join with `PaymentUserIban` table
- The historical IBAN is returned
- SEPA XML generation uses the historical IBAN value
- Current IBAN changes do not affect existing payment IBAN values

### FR-4: Atomic Payment Creation

Payment creation and IBAN capture SHALL be performed atomically to ensure data consistency.

**Acceptance Criteria:**

- If payment creation fails, no `PaymentUserIban` records are created
- If IBAN capture fails, the payment is not created
- All database operations are part of a single transaction or fail together

### FR-5: Data Migration for Existing Payments

When deploying this feature, existing payments SHALL be backfilled with `PaymentUserIban` records using trainers' current IBAN values.

**Acceptance Criteria:**

- Migration creates `PaymentUserIban` records for all existing payments
- One record per unique trainer per payment
- Uses the trainer's current IBAN value (best available data)
- Migration is idempotent (safe to run multiple times)
