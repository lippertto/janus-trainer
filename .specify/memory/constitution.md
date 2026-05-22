<!--
SYNC IMPACT REPORT
==================
Version: 1.0.0 (initial creation)
Modified Principles: N/A (initial)
Added Sections: All core principles and governance established
Removed Sections: N/A

Templates Status:
✅ plan-template.md - reviewed, "Constitution Check" section aligns with principles
✅ spec-template.md - reviewed, requirements and user stories align with mobile-first
✅ tasks-template.md - reviewed, test-first pattern matches TDD principle
✅ commands/*.md - reviewed, no agent-specific references requiring updates

Follow-up TODOs: None
-->

# Janus Trainer Constitution

## Core Principles

### I. Mobile-First for Trainer Views (NON-NEGOTIABLE)

The `/enter` route and all trainer-facing features MUST prioritize mobile experience:
- Design and test on mobile viewports first (320px-428px width)
- Touch-friendly controls with minimum 44px tap targets
- Form inputs optimized for mobile keyboards (`inputMode`, `autocomplete` attributes)
- Minimize typing requirements using dropdowns, date pickers, and auto-fill
- Test changes on actual mobile devices or browser DevTools mobile emulation

Admin routes (`/approve`, `/compensate`, `/configure`) use desktop-optimized DataGrid
tables for office PC workflows.

**Why**: Trainers enter sessions from mobile devices in the field. Poor mobile UX
creates friction, leading to delayed submissions and data entry errors. Office admins
exclusively use desktop PCs.

**How to apply**: When implementing or modifying `/enter/**` routes, test in mobile
viewport first. Use Chrome DevTools device emulation or physical device testing before
marking work complete.

### II. Test-Driven Development for API Routes

All new API routes and changes to existing routes MUST follow test-first workflow:
- Write integration tests in `api-tests/` that define expected behavior
- Tests run against real PostgreSQL database (not mocks)
- Verify tests FAIL before implementation (Red-Green-Refactor)
- Tests run in CI pipeline to prevent regressions
- No parallel test execution (`--no-file-parallelism`) to avoid database conflicts

**Why**: Mocked tests passing while production fails has caused incidents. Real database
testing catches schema mismatches, constraint violations, and migration issues before
deployment.

**How to apply**: For any `/app/api/**` route changes, write tests in `api-tests/` first.
Run `yarn test:api` locally with database running and `DISABLE_JWT_CHECKS=1` before
pushing.

### III. Security-First API Design

All API routes MUST implement security controls:
- Authorization checks using `allowOnlyAdmins()`, `allowAdminOrSelf()`, or `allowNoOne()`
- Input validation via DTOs with class-validator decorators before processing
- JWT token verification enforced (except test mode with `DISABLE_JWT_CHECKS=1`)
- Never commit sensitive data (.env files, credentials, tokens) to version control
- Fix discovered vulnerabilities immediately before proceeding with other work

**Why**: Janus Trainer handles financial compensation data and personally identifiable
information. Security breaches expose trainer payment details, user credentials, and
organizational financial data.

**How to apply**: On every API route implementation or edit, verify authorization check
is first operation. Validate all inputs with `validateOrThrow()`. Run security review
before merging significant changes.

### IV. Database Schema Evolution Discipline

Database schema changes MUST follow the documented workflow:
1. Update `prisma/schema.prisma`
2. Push to local DB: `yarn run dotenv -e .env.development -- prisma db push`
3. Generate TypeScript client: `yarn run dotenv -e .env.development -- prisma generate`
4. Test changes thoroughly with API tests
5. Create migration when complete: `yarn run dotenv -e .env.development -- prisma migrate dev`

Never run Prisma commands without `dotenv -e .env.development` prefix. Always create
migrations for schema changes before merging to main branch.

**Why**: Skipping steps causes schema drift between environments, failed migrations in
CI/production, and TypeScript client staleness.

**How to apply**: Follow exact command sequence. Verify migration files created before
committing schema changes. Test migrations on clean database before pushing.

### V. Consistent API Contracts

All API routes MUST follow standardized patterns:
- Wrap handlers with `handleTopLevelCatch()` for unified error handling
- Validate request DTOs with `validateOrThrow()` before business logic
- Use typed errors: `ApiErrorBadRequest`, `ApiErrorUnauthorized`, `ApiErrorForbidden`, `ApiErrorNotFound`
- Return `NextResponse.json({ value: data })` for success, `emptyResponse()` for 204 No Content
- Define DTOs in `lib/dto.ts` with class-validator decorators

**Why**: Consistent patterns enable centralized logging, proper HTTP status codes,
predictable client-side error handling, and clear validation error messages.

**How to apply**: Copy the pattern from existing API routes in `/app/api/`. Never bypass
validation or use raw `try/catch` without `handleTopLevelCatch()` wrapper.

### VI. Avoid Premature Abstraction

Code changes MUST stay focused on immediate requirements:
- No new features, refactoring, or abstractions beyond task scope
- Bug fixes don't require surrounding cleanup
- Three similar lines preferred over premature helper function
- Don't design for hypothetical future requirements (YAGNI)
- No half-finished implementations or scaffolding for "later"

**Why**: Premature abstractions create technical debt when requirements change.
Speculative features add complexity without proven value. Incomplete work causes
confusion and merge conflicts.

**How to apply**: When tempted to "clean up while we're here" or "make this more
generic," stop. Only abstract when third genuinely identical use case appears.

## Technology Standards

All new code MUST use the established technology stack:
- **Frontend**: Next.js 16 App Router, React 19, Material-UI 9
- **Backend**: Next.js API Routes with Prisma ORM
- **Authentication**: AWS Cognito + NextAuth.js
- **State Management**: TanStack Query for server state
- **Testing**: Vitest (unit/API), Playwright (E2E), React Testing Library (components)
- **Database**: PostgreSQL with Prisma migrations

Do not introduce alternative frameworks, state management solutions, or database access
patterns without documented justification and approval.

## Development Workflow

### Pre-Merge Quality Gates

Before any PR merge:
- `yarn lint:check` passes
- `yarn format:check` passes
- `yarn test` passes (unit tests)
- `yarn test:api` passes (API integration tests)
- Playwright tests pass for affected user flows
- `yarn build` succeeds (no TypeScript errors)

### Testing Requirements

- **API Routes**: Integration tests in `api-tests/` required for all new routes and changes
- **User Flows**: Playwright tests for critical paths (enter → approve → compensate)
- **Components**: React Testing Library tests for complex UI logic
- **Database Changes**: Test migrations locally on clean database before pushing

### UI/Frontend Verification

For UI or frontend changes:
1. Start dev server and test the feature in browser
2. Test golden path AND edge cases
3. Monitor for regressions in related features
4. If unable to test the UI, explicitly document limitations

Type checking and test suites verify code correctness, NOT feature correctness.

## Governance

This constitution supersedes all other development practices and preferences. When
guidance conflicts, the constitution takes precedence.

**Amendment Process**:
1. Propose change with rationale and impact analysis
2. Document what changes and why
3. Update version using semantic versioning (MAJOR.MINOR.PATCH)
4. Update dependent templates and documentation
5. Commit with message referencing version bump

**Version Policy**:
- MAJOR: Backward-incompatible principle removals or redefinitions
- MINOR: New principles added or materially expanded guidance
- PATCH: Clarifications, wording fixes, non-semantic refinements

**Compliance**:
- All PRs and code reviews MUST verify adherence to core principles
- Mobile-First, Test-Driven, and Security-First principles are NON-NEGOTIABLE
- Complexity and deviations MUST be justified in PR descriptions
- Refer to CLAUDE.md for runtime development guidance and commands

**Version**: 1.0.0 | **Ratified**: 2026-05-22 | **Last Amended**: 2026-05-22
