## 1. Database migration and entity fields

### Contract
- **Spec**: "The system SHALL allow an authenticated admin to open a new engagement for a client for a specific tax year. Multiple engagements per client per tax year are permitted, but no two engagements for the same client and tax year may share the same name. A `name` field is mandatory on creation." — `client-engagement-workflow` spec, Requirement: Create a client engagement
- **Runtime**: `cd backend && ./mvnw test` → all existing tests pass; Flyway migration applies cleanly; `ClientEngagement` entity has `name` and `note` fields
- **Code**: Use `DEFAULT ''` temporarily for NOT NULL `name` column so existing rows are satisfied; drop default after adding constraint. New unique constraint is `(client_id, tax_year, name)`. `note` is nullable TEXT — no max length.
- **Threshold**: 80

- [ ] 1.0 CONTRACT — write openspec/changes/engagement-name-note/contracts/group-1.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [ ] 1.1 Write `V15__add_name_note_to_engagements.sql`: drop old unique constraint, add `name VARCHAR(255) NOT NULL DEFAULT ''`, add `note TEXT`, add new unique constraint `(client_id, tax_year, name)`, drop the default
- [ ] 1.2 Add `name` (String, `@Column(nullable = false)`) and `note` (String, nullable) to `ClientEngagement` entity
- [ ] 1.3 Add `name` and `note` fields to `EngagementDto`; update any projection/mapping that builds `EngagementDto` to include both fields
- [ ] 1.4 Run `cd backend && ./mvnw test` — confirm Flyway applies cleanly and all existing tests pass
- [ ] 1.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-1.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

---

## 2. Backend service and controller

### Contract
- **Spec**: "WHEN an authenticated admin sends `POST /api/admin/clients/{clientId}/engagements` without a `name` field or with a blank `name` THEN the system returns `400 Bad Request`." "WHEN an authenticated admin sends `PATCH /api/admin/clients/{clientId}/engagements/{id}/status` with a valid `status` and optional `note` THEN the system updates the engagement's status … replaces the engagement's `note` with the provided value (or null), appends a history row … and returns `200 OK` with the updated engagement including the new `note`." "WHEN an authenticated admin sends a status transition for an engagement ID that does not exist THEN the system returns `404 Not Found`." — `client-engagement-workflow` spec
- **Runtime**: `cd backend && ./mvnw test` → all tests pass including new tests for: blank name → 400, valid name → 201, duplicate name same year → 409, second name same year → 201, transition updates engagement.note, history GET uses {id}
- **Code**: `CreateEngagementRequest` gains `@NotBlank String name`. `ClientEngagementService.createEngagement()` receives name, sets it on entity. `transitionStatus()` looks up by engagementId (not taxYear), persists `request.note()` to `ClientEngagement.note`. Controller switches `{taxYear}` path param to `{id}` on history and status endpoints. Ownership check: verify `engagement.getClientId()` belongs to the authenticated admin's client set.
- **Threshold**: 80

- [ ] 2.0 CONTRACT — write openspec/changes/engagement-name-note/contracts/group-2.md with the ### Contract block above; confirm all three fields are non-empty before proceeding
- [ ] 2.1 RED — add `@NotBlank String name` to `CreateEngagementRequest`; write test asserting `POST /engagements` with blank name returns 400
- [ ] 2.2 GREEN — update `CreateEngagementRequest` with `@NotBlank String name`; update `ClientEngagementService.createEngagement()` to accept and persist name
- [ ] 2.3 RED — write test asserting `POST /engagements` with valid name returns 201 with `name` in response body
- [ ] 2.4 GREEN — update controller to pass name from request to service; update `EngagementDto` mapping to include name
- [ ] 2.5 RED — write test asserting duplicate `(clientId, taxYear, name)` returns 409; write test asserting same year with different name returns 201
- [ ] 2.6 GREEN — handle `DataIntegrityViolationException` from duplicate unique constraint → 409 in controller or exception handler
- [ ] 2.7 RED — write test asserting `PATCH /engagements/{id}/status` updates `ClientEngagement.note` to the provided value
- [ ] 2.8 GREEN — update `ClientEngagementService.transitionStatus()` to accept engagementId (Long), look up by ID, persist `request.note()` to `ClientEngagement.note`
- [ ] 2.9 RED — write test asserting `GET /engagements/{id}/history` returns 200 (route uses id, not taxYear); write test asserting unknown id returns 404
- [ ] 2.10 GREEN — update `ClientEngagementController`: change `{taxYear}` path variable to `{id}` on history and status endpoints; look up engagement by ID with ownership check
- [ ] 2.11 Run `cd backend && ./mvnw test` — all tests pass
- [ ] 2.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-2.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

---

## 3. Frontend admin dialogs and service URLs

### Contract
- **Spec**: "WHEN an admin opens the New Engagement dialog and has not entered a name THEN the confirm button is disabled." "WHEN an admin opens the Change Status dialog for an engagement that has an existing note THEN the 'Engagement Notes' textarea is pre-filled with the current note text." "WHEN an admin edits the note in the Change Status dialog and confirms THEN the updated note is saved to the engagement." — `admin-workflow-ui` spec
- **Runtime**: `cd frontend && npx ng test --no-watch` → all tests pass including new tests for: submit disabled with blank name, note textarea pre-filled, note sent on submit, service URLs use engagement ID
- **Code**: `mat-form-field` + `matInput` for name field (never bare `<input>`). Note textarea is `mat-form-field` with `<textarea matInput>`. Angular service methods building URLs switch `taxYear` → `engagement.id`. Zoneless change detection — no Zone.js.
- **Threshold**: 80

- [ ] 3.0 CONTRACT — write openspec/changes/engagement-name-note/contracts/group-3.md with the ### Contract block above; confirm all three fields are non-empty before proceeding
- [ ] 3.1 RED — write test for `AdminNewEngagementDialogComponent`: submit button disabled when name is empty; enabled when name is non-blank
- [ ] 3.2 GREEN — add `name` form control (`Validators.required`) to new engagement dialog; add `<mat-form-field><input matInput formControlName="name" /></mat-form-field>`; disable submit while form invalid
- [ ] 3.3 RED — write test for `AdminTransitionDialogComponent`: note textarea present and pre-filled with `data.engagement.note`
- [ ] 3.4 GREEN — add `note` form control to transition dialog, pre-filled from `data.engagement.note`; include note in submit payload; label textarea "Engagement Notes"
- [ ] 3.5 Update Angular engagement service: all methods building `{taxYear}` URL segments switch to `engagement.id` (or accept `engagementId` param); update any component that passes taxYear to the service
- [ ] 3.6 Update admin workflow tab/list: each engagement row shows engagement `name` alongside tax year and status; expand panel shows current engagement note
- [ ] 3.7 Run `cd frontend && npx ng test --no-watch` — all tests pass
- [ ] 3.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-3.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

---

## 4. Client portal — engagement name

### Contract
- **Spec**: "WHEN an authenticated client views their engagement list in the portal THEN each engagement row shows the engagement name, tax year, and current status." "WHEN a client has two engagements for the same tax year THEN both rows appear with distinct names, making them unambiguously identifiable." — `client-portal-ui` spec
- **Runtime**: `cd frontend && npx ng test --no-watch` → new test for portal engagement list component passes: each row renders engagement name
- **Code**: Engagement name sourced from `EngagementDto.name` (already added in group 1). No new API calls required — portal uses the same engagement list endpoint.
- **Threshold**: 80

- [ ] 4.0 CONTRACT — write openspec/changes/engagement-name-note/contracts/group-4.md with the ### Contract block above; confirm all three fields are non-empty before proceeding
- [ ] 4.1 RED — write test for the client portal engagement list component: each engagement row renders `engagement.name`
- [ ] 4.2 GREEN — update portal engagement list template to display `engagement.name` alongside tax year and status
- [ ] 4.3 Run `cd frontend && npx ng test --no-watch` — all tests pass
- [ ] 4.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-4.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

---

## 5. E2E test and final verification

- [ ] 5.1 Write Playwright e2e test in `e2e/`: create two engagements for the same client in the same tax year with different names; verify both appear in the admin workflow tab list with their respective names
- [ ] 5.2 Run e2e suite: `cd e2e && npx playwright test` (start backend and frontend first if not running)
- [ ] 5.3 Run `/security-review` on the branch diff; address Critical/High/Medium findings before proceeding
- [ ] 5.4 Run `superpowers:verification-before-completion`
