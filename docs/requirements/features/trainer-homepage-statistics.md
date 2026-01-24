# Feature: Trainer Homepage Statistics

## Overview

Display training activity statistics on the trainer's homepage to provide quick insights into their current year's training activities and compensation status.

## User Story

**As a** trainer
**I want to** see my training statistics on the homepage
**So that** I can quickly understand my training activity and compensation status for the current year

## Functional Requirements

### FR-1: Statistics Display

The homepage SHALL display a statistics panel for authenticated users in the "trainers" group.

### FR-2: Total Compensation Tracking

The statistics panel SHALL display:

- Current year's total compensation (sum of all training compensations)
- Maximum allowed compensation per year (from system configuration)
- Format: "{current} / {maximum}" in EUR currency

Example: "Gesamtvergütung: 425,00 € / 3.000,00 €"

### FR-3: Per-Course Training Count

For each course the trainer has conducted trainings in the current year, the statistics SHALL display:

- Course name
- Number of trainings conducted
- Maximum trainings allowed per course (from system configuration)
- Format: "{count} / {maximum} Einheiten"

### FR-4: Period Scope

Statistics SHALL be calculated for the current calendar year (January 1st to December 31st).

### FR-5: Real-time Data

Statistics SHALL be fetched from the existing trainer reports API endpoint with query parameters:

- `trainerId`: Current authenticated user's ID
- `start`: Current year start date (YYYY-MM-DD)
- `end`: Current year end date (YYYY-MM-DD)

### FR-6: Configuration Integration

The statistics SHALL use configurable limits from the application configuration:

- `max-compensation-cents-per-year`: Maximum compensation limit
- `max-trainings-per-course`: Maximum training sessions per course

### FR-7: Empty State

When a trainer has no trainings for the current year:

- Display total compensation as "0,00 €"
- Do NOT display the "Pro Kurs" (per-course) section

### FR-8: Admin Exclusion

The statistics panel SHALL NOT be displayed for users who are only in the "admins" group (without "trainers" group membership).

## Rationale

### Why This Feature?

Trainers need quick visibility into:

1. **Compensation status**: Are they approaching the yearly tax limit?
2. **Training limits**: Are they approaching the per-course limit?
3. **Activity overview**: How much training have they conducted this year?

This information was previously only available by generating a full trainer report, requiring multiple clicks and navigation.

### Design Decisions

**Current year only**: Showing historical years would add complexity. Current year is the most actionable information.

## Future Enhancements

Potential improvements not included in this implementation:

- Historical year selection (dropdown to view previous years)
- Visual progress bars for compensation and training limits
- Warning indicators when approaching limits (e.g., >90% of maximum)
- Month-by-month breakdown graph
- Comparison to average trainer statistics
