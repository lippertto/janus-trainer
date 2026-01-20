# Feature: Training Statistics (Admin View)

## Overview

Provide administrators with aggregated training statistics across the organization, grouped by trainer, cost center, or course. The statistics enable tracking of training activity, compensation totals, and compliance with organizational limits.

## User Story

**As an** administrator
**I want to** view aggregated training statistics across different dimensions
**So that** I can monitor training activity, budget allocation, and ensure compliance with limits across the organization

## Functional Requirements

### FR-1: Statistics Endpoint

The system SHALL provide a POST endpoint at `/api/training-statistics` that accepts:

- **Query Parameters:**
  - `year` (required): Four-digit year (e.g., 2024)
  - `groupBy` (required): Aggregation dimension - one of:
    - `trainer`: Group by individual trainers
    - `cost-center`: Group by cost centers (disciplines)
    - `course`: Group by courses

### FR-2: Authorization

The statistics endpoint SHALL be restricted to users in the "admins" group only.

### FR-3: Training Count Calculation

Training counts SHALL represent the number of **unique training sessions**, not individual Training records.

**Rationale:** Multiple trainers can co-teach the same lesson (same course on the same date). Since the organization ensures only one lesson per course happens per day, the system SHALL count by distinct dates.

**Implementation:**

- Count `DISTINCT date` values for each group
- Example: If Trainer A and Trainer B both taught Course 1 on 2024-01-15, this counts as **1 training session**, not 2

### FR-4: Compensation Calculation

Compensation totals SHALL sum all individual Training records, even when multiple trainers work together.

**Rationale:** Each trainer receives their own compensation for co-taught lessons.

**Implementation:**

- Sum all `compensationCents` values for each group
- Example: If Trainer A earned 50€ and Trainer B earned 50€ for the same lesson, total compensation is **100€**

### FR-5: Quarterly Breakdown

For each group, the statistics SHALL provide:

- **Training counts per quarter:**
  - `trainingCountQ1`: Unique training sessions in Q1 (Jan-Mar)
  - `trainingCountQ2`: Unique training sessions in Q2 (Apr-Jun)
  - `trainingCountQ3`: Unique training sessions in Q3 (Jul-Sep)
  - `trainingCountQ4`: Unique training sessions in Q4 (Oct-Dec)
  - `trainingCountTotal`: Total unique training sessions in the year

- **Compensation totals per quarter:**
  - `compensationCentsQ1`: Total compensation in Q1 (in cents)
  - `compensationCentsQ2`: Total compensation in Q2 (in cents)
  - `compensationCentsQ3`: Total compensation in Q3 (in cents)
  - `compensationCentsQ4`: Total compensation in Q4 (in cents)
  - `compensationCentsTotal`: Total compensation in the year (in cents)

### FR-6: Status Filter

Statistics SHALL only include trainings with status `COMPENSATED`.

**Rationale:** Only compensated trainings represent completed, approved, and paid sessions.

## Business Rules

### BR-1: Co-Teaching Scenario

When multiple trainers conduct the same training session:

- **Training Count:** Count as 1 session (unique date per course)
- **Compensation:** Sum all trainer compensations
- **Limit Enforcement:** Session count applies to insurance limits, not compensation limits

**Example:**

- Course: "Advanced Training"
- Date: 2024-03-15
- Trainer A: 50€ compensation
- Trainer B: 50€ compensation

**Statistics Output:**

- Training count: **1** (one session)
- Total compensation: **100€** (both trainers paid)

### BR-2: Insurance Limit Compliance

The per-course training count limit (configured in `max-trainings-per-course`) applies to **unique training sessions**, not individual trainer participations.

**Example:** If the limit is 44 sessions per course:

- 44 sessions with 1 trainer = OK
- 22 sessions with 2 trainers each = OK (22 unique dates)
- 45 sessions with 1 trainer = Exceeds limit

### BR-3: Tax Limit Compliance

The per-year compensation limit (configured in `max-compensation-cents-per-year`) applies to **total compensation paid**, including co-taught sessions.

## Rationale

### Why Distinct Date Counting?

The organization has a business rule: **Only one lesson per course happens per day**. This means:

- If two trainers have Training records for the same course and date, they co-taught the same lesson
- The session count should reflect actual lessons conducted, not administrative records
- Insurance and regulatory limits apply to physical training sessions, not database records

### Why Sum All Compensations?

Even though multiple trainers may teach together:

- Each trainer performs work and deserves payment
- Tax limits apply to total payments, regardless of session sharing
- Budget tracking requires accurate total costs

## UI Integration

### Trainer Statistics Component

The `TrainerStatistics` component displays per-course training counts for individual trainers.

**Deduplication Logic:**

- Uses `new Set(course.trainings.map(t => t.date)).size` to count unique dates
- Consistent with backend SQL logic
- Displays: "{uniqueDates} / {maxTrainingsPerCourse} Einheiten"

**Example:**

```
Test Course
3 / 44 Einheiten
```

Where 3 represents unique training sessions, even if the trainer co-taught some sessions.

## Future Enhancements

Potential improvements not included in this implementation:

- **Date range filtering:** Custom start/end dates instead of full year only
- **Multi-dimensional grouping:** Combine trainer + cost center, etc.
- **Export functionality:** CSV/Excel export of statistics
- **Trend analysis:** Year-over-year comparisons
- **Warning thresholds:** Flag trainers/courses approaching limits
- **Real-time updates:** WebSocket-based live statistics
- **Pagination:** For organizations with many trainers/courses
- **Filtering:** By specific trainers, courses, or cost centers
