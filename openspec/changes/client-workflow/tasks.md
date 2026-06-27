## 1. DB migrations + Client entity extension

### Contract
- **Spec**: (client-management) "Every client record SHALL have a `business_type` field with one of three values: PERSONAL, CORPORATE, or SELF_EMPLOYED. The field is required on creation." | "For PERSONAL clients, the fiscal year end is always December 31 and SHALL be ignored if supplied — it is stored as month=12, day=31. For CORPORATE and SELF_EMPLOYED clients, the admin SHALL supply a valid month/day on creation; the pair must represent a real calendar date." | "The system returns `400 Bad Request` for missing or invalid business type, missing FYE for non-personal, or invalid calendar date."
- **Runtime**: `cd backend && ./mvnw test` → all tests pass; new ClientService/ClientController tests for businessType and fiscalYearEnd validation pass; no existing tests regress
- **Code**: V13 migration adds `business_type VARCHAR(20) NOT NULL DEFAULT 'PERSONAL'`, `fiscal_year_end_month SMALLINT NOT NULL DEFAULT 12`, `fiscal_year_end_day SMALLINT NOT NULL DEFAULT 31` — defaults ensure existing rows pass NOT NULL; validate FYE using `java.time.MonthDay.of(month, day)` which throws `DateTimeException` on invalid dates; PERSONAL clients always store 12/31 server-side regardless of input
- **Threshold**: 80

- [ ] 1.0 CONTRACT — write openspec/changes/client-workflow/contracts/group-1.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [ ] 1.1 RED — write failing `@DataJpaTest` test: create client with CORPORATE business type and valid FYE → persists correctly; create with missing FYE → validation error; create with invalid FYE (Feb 30) → validation error
- [ ] 1.2 GREEN — add `BusinessType` enum (PERSONAL, CORPORATE, SELF_EMPLOYED); add `business_type`, `fiscal_year_end_month`, `fiscal_year_end_day` to `Client` entity; write V13 migration; add FYE validation in `ClientService` using `MonthDay.of()`; update `CreateClientRequest`, `UpdateClientRequest`, `ClientDto`
- [ ] 1.3 RED — write failing `@WebMvcTest` test for `ClientController`: POST without businessType → 400; POST PERSONAL ignores supplied FYE → stores Dec 31; POST CORPORATE without FYE → 400; POST CORPORATE with Feb 30 → 400
- [ ] 1.4 GREEN — update `ClientController` and `ClientService` to validate and enforce business type + FYE rules; PERSONAL always sets month=12, day=31
- [ ] 1.5 RED — write failing test: existing NOT NULL migration regression — any raw SQL INSERT helpers in `@DataJpaTest` that insert clients must include the new columns
- [ ] 1.6 GREEN — audit `src/test` for INSERT INTO clients statements; add `business_type`, `fiscal_year_end_month`, `fiscal_year_end_day` columns to any raw INSERT helpers found
- [ ] 1.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-1.md + client-management/spec.md + design.md + group 1 diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 2. ClientEngagement backend

### Contract
- **Spec**: (client-engagement-workflow) "The system SHALL allow an authenticated admin to open a new engagement for a client for a specific tax year. Only one engagement per client per tax year is permitted. A new engagement is created at status START." | "The system SHALL allow an authenticated admin to move any engagement from any status to any other status. The transition SHALL be recorded in `client_engagement_history`." | "The system SHALL persist a history entry for every status transition, including the initial creation (from_status = null, to_status = START)." | "The system SHALL provide an endpoint that returns all engagements across all clients and all tax years." | "All engagement endpoints SHALL return `403 Forbidden` for non-admin callers."
- **Runtime**: `cd backend && ./mvnw test` → all tests pass; ClientEngagementController and ClientEngagementService tests cover create, list, transition, history, list-all, and auth scenarios
- **Code**: custom enum state machine — any status can transition to any other (no guard logic needed); audit trail in separate `client_engagement_history` table with nullable `from_status`; `GET /api/admin/engagements` joins Client for name/businessType and User for updatedByName; all endpoints secured with `hasRole('ADMIN')`
- **Threshold**: 80

- [ ] 2.0 CONTRACT — write openspec/changes/client-workflow/contracts/group-2.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [ ] 2.1 RED — write V14 migration for `client_engagements` (UNIQUE on client_id + tax_year) and `client_engagement_history` (FK CASCADE DELETE); write failing `@DataJpaTest` test: create engagement, verify UNIQUE constraint on duplicate (client_id, tax_year), verify initial history row with from_status=null
- [ ] 2.2 GREEN — write `EngagementStatus` enum; `ClientEngagement` and `ClientEngagementHistory` entities; `ClientEngagementRepository` and `ClientEngagementHistoryRepository`; V14 migration
- [ ] 2.3 RED — write failing `@SpringBootTest` (or `@WebMvcTest`) test for `ClientEngagementController`: POST create → 201 + START status; duplicate → 409; missing taxYear → 400; client not found → 404
- [ ] 2.4 GREEN — implement `ClientEngagementService.createEngagement()` and `ClientEngagementController` POST endpoint; write initial history entry on creation
- [ ] 2.5 RED — write failing test: PATCH status transition → 200 + new status + history row appended with correct from/to/changed_by/note; invalid status string → 400; engagement not found → 404
- [ ] 2.6 GREEN — implement `ClientEngagementService.transitionStatus()` and PATCH endpoint; write history row on every transition
- [ ] 2.7 RED — write failing test: GET engagements for client → list ordered by taxYear desc; GET engagement history → ordered oldest first; GET all engagements → includes clientName, businessType, updatedByName
- [ ] 2.8 GREEN — implement `ClientEngagementService` list methods and GET endpoints; join Client + User for dashboard endpoint
- [ ] 2.9 RED — write failing test: non-admin caller to any engagement endpoint → 403; unauthenticated → 401
- [ ] 2.10 GREEN — secure all engagement endpoints with `hasRole('ADMIN')` in `SecurityConfig`
- [ ] 2.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-2.md + client-engagement-workflow/spec.md + design.md + group 2 diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 3. Email notifications

### Contract
- **Spec**: (client-engagement-workflow) "The system SHALL send an email to the client's linked user when status transitions to IN_PROCESSING, PENDING_CLIENT_REVIEW, SUBMIT_TO_CRA, or COMPLETED." | "The email language SHALL match the linked user's `language` preference (defaulting to EN if null)." | "No email is sent for transitions to START or when the client has no linked user." | "Email delivery failure SHALL NOT prevent the status transition from succeeding."
- **Runtime**: `cd backend && ./mvnw test` → email notification tests pass using a mock `JavaMailSender`; no email sent for START or unlinked clients; ZH email sent when user.language = "zh"
- **Code**: inline bilingual templates (8 strings: 4 states × 2 languages) as constants in service; catch `MailException` and log — do not propagate; check `client.userId` non-null before attempting send; use existing `JavaMailSender` bean (same infrastructure as ContactService)
- **Threshold**: 80

- [ ] 3.0 CONTRACT — write openspec/changes/client-workflow/contracts/group-3.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [ ] 3.1 RED — write failing unit test for email logic: mock `JavaMailSender`; transition to IN_PROCESSING with linked EN user → email sent in English; transition to IN_PROCESSING with linked ZH user → email in Chinese; transition to START → no email; no linked user → no email, no exception; mail failure → exception swallowed, status still persists
- [ ] 3.2 GREEN — add bilingual email notification logic to `ClientEngagementService.transitionStatus()`: look up linked user via `client.userId`, choose language, select template string, send via `JavaMailSender`, catch `MailException` and log
- [ ] 3.3 RED — write failing tests for remaining three notification states (PENDING_CLIENT_REVIEW, SUBMIT_TO_CRA, COMPLETED) — verify correct subject and body fragment in each language
- [ ] 3.4 GREEN — implement templates for all four notification states in both EN and ZH; add subject lines
- [ ] 3.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-3.md + client-engagement-workflow/spec.md (email sections) + design.md + group 3 diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 4. Admin workflow dashboard UI

### Contract
- **Spec**: (admin-workflow-ui) "The system SHALL provide a `/admin/workflow` page accessible only to authenticated admins displaying a table of all client engagements across all tax years." | "Table columns: Client Name, Business Type, Tax Year, Status, Last Updated, Last Updated By." | "The table SHALL support filtering by Status and by Business Type." | "The page SHALL be linked in the admin sidebar navigation." | "Client create/edit dialog SHALL include business type and fiscal year end fields."
- **Runtime**: `cd frontend && npx ng test --no-watch` → AdminWorkflowComponent unit tests pass; filter-by-status and filter-by-business-type tests pass; client dialog businessType/FYE field tests pass
- **Code**: standalone zoneless Angular component; Angular Material table (`mat-table`) with `mat-select` filters; lazy-loaded route under `/admin/workflow` protected by `adminGuard`; `EngagementService` wraps `GET /api/admin/engagements`; business type select + conditional FYE fields in `AdminClientDialogComponent` (hide FYE for PERSONAL, show + require for CORPORATE/SELF_EMPLOYED)
- **Threshold**: 80

- [ ] 4.0 CONTRACT — write openspec/changes/client-workflow/contracts/group-4.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [ ] 4.1 RED — write failing Vitest test for `AdminWorkflowComponent`: renders table with mocked engagement data; status filter hides non-matching rows; business type filter hides non-matching rows
- [ ] 4.2 GREEN — create `AdminWorkflowComponent` (standalone, zoneless) with `mat-table`, status `mat-select` filter, business type `mat-select` filter; add `EngagementService` with `getAllEngagements()` calling `GET /api/admin/engagements`; add route `/admin/workflow` to `app.routes.ts` behind `adminGuard`; add "Workflow" link to admin sidebar
- [ ] 4.3 RED — write failing Vitest test for `AdminClientDialogComponent`: business type select present; FYE fields hidden when PERSONAL; FYE fields shown and required when CORPORATE; submit without FYE → form invalid
- [ ] 4.4 GREEN — update `AdminClientDialogComponent` to add business type select and conditional FYE month/day inputs; update `AdminClientsService` to pass businessType and fiscalYearEnd in create/update requests
- [ ] 4.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-4.md + admin-workflow-ui/spec.md + design.md + group 4 diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 5. Client detail workflow tab

### Contract
- **Spec**: (admin-workflow-ui) "The system SHALL add a 'Workflow' tab to the admin client detail view listing all engagements ordered by tax year descending." | "Each engagement SHALL be expandable to reveal its full transition history." | "The system SHALL allow an admin to open a new engagement from the Workflow tab." | "The system SHALL allow an admin to change status with an optional note via a confirmation dialog." | "Duplicate tax year rejected in UI with error message."
- **Runtime**: `cd frontend && npx ng test --no-watch` → client workflow tab component tests pass: engagement list renders, expand shows history, new engagement dialog creates entry, status transition dialog sends PATCH with note
- **Code**: workflow tab loaded lazily on first `mat-tab` activation; engagements fetched from `GET /api/admin/clients/{id}/engagements`; history fetched per engagement from `GET /api/admin/clients/{id}/engagements/{year}/history` on expand; status transition uses Angular Material dialog with optional note field before sending PATCH; duplicate detection: show inline error from 409 response
- **Threshold**: 80

- [ ] 5.0 CONTRACT — write openspec/changes/client-workflow/contracts/group-5.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [ ] 5.1 RED — write failing Vitest test for client workflow tab: Workflow tab visible in client detail; engagement list rendered from mocked service; empty state shown when no engagements
- [ ] 5.2 GREEN — add Workflow `mat-tab` to admin client detail view (determine the correct existing component from codebase exploration); create `ClientWorkflowTabComponent` with engagement list and empty state; extend `EngagementService` with `getEngagementsForClient(clientId)` and `getEngagementHistory(clientId, taxYear)`
- [ ] 5.3 RED — write failing test: expand engagement row → history entries shown; new engagement dialog → POST sent with taxYear; duplicate taxYear → error message displayed
- [ ] 5.4 GREEN — implement expandable engagement row with lazy history fetch; "New Engagement" dialog (`mat-dialog`) with taxYear input; handle 409 → show inline error
- [ ] 5.5 RED — write failing test: status transition control changes status; confirmation dialog shown with optional note field; PATCH sent with note; new history entry appears after transition
- [ ] 5.6 GREEN — implement status select + confirmation dialog (`mat-dialog`) with optional note `mat-form-field`; PATCH to `/api/admin/clients/{id}/engagements/{year}/status`; refresh engagement list and history on success
- [ ] 5.7 Run `/security-review` on the branch diff; address Critical/High/Medium findings before proceeding
- [ ] 5.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-5.md + admin-workflow-ui/spec.md + design.md + group 5 diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 6. E2E + verification

- [ ] 6.1 Run baseline test suites — `cd backend && ./mvnw test` and `cd frontend && npx ng test --no-watch` — confirm no regressions before writing E2E
- [ ] 6.2 RED — write failing Playwright E2E test: admin logs in → navigates to /admin/workflow → table visible with expected columns; filter by status → rows change
- [ ] 6.3 GREEN — confirm servers running (start if needed per CLAUDE.md); run Playwright test → passes
- [ ] 6.4 RED — write failing Playwright E2E test: admin opens a client → Workflow tab → creates 2025 engagement → status transitions to IN_PROCESSING → history row visible with transition details
- [ ] 6.5 GREEN — run Playwright test → passes; commit E2E test file
- [ ] 6.6 Run superpowers:verification-before-completion (run `cd backend && ./mvnw test` and `cd frontend && npx ng test --no-watch`; grep -r console.log on frontend src; run project.custom_verification_checks from openspec/config.yaml)
