# Eval Log — engagement-name-note

<!-- Appended by evaluator subagent after each N.E EVAL run -->

```yaml
- group: 1
  attempt: 1
  scores:
    spec: 35
    runtime: 90
    code: 75
  total: 66.5
  status: RETRY
  findings:
    - "spec: CREATE endpoint does not accept `name` in request body — violates SHALL requirement 'name field is mandatory on creation'"
    - "spec: Service layer `createEngagement()` method signature missing `name` parameter"
    - "code: Migration strategy correct (DEFAULT '' → DROP DEFAULT pattern), but endpoint never populates name"
    - "code: Entity, DTOs, and service-layer mappers correctly updated for name/note fields"
    - "code: Unique constraint (client_id, tax_year, name) correctly defined in entity and migration"
    - "runtime: All tests pass, but DataJpaTest manually sets name (hiding the API gap); ControllerTest mocks service (no integration verification)"
  fix_tasks:
    - "Add `name: @NotBlank String` field to `CreateEngagementRequest` with proper validation"
    - "Update `ClientEngagementService.createEngagement()` signature to accept `String name` parameter"
    - "Update `ClientEngagementController.create()` to pass request.name() to service"
    - "Update `ClientEngagementControllerTest` to verify name is passed through (e.g. test creating two engagements with same year, different names)"
    - "Re-run full test suite to confirm unique constraint enforcement via API"

- group: 1
  attempt: 2
  scores:
    spec: 100
    runtime: 100
    code: 95
  total: 98
  status: PASS
  findings:
    - "spec: All SHALL requirements satisfied — name field mandatory, unique constraint (client_id, tax_year, name), multiple engagements allowed with different names, all scenarios tested"
    - "runtime: All 18 tests pass (15 in ControllerTest, 3 in EntityTest); unique constraint enforcement verified via duplicate name test and multi-name same-year test"
    - "code: CreateEngagementRequest validates name with @NotBlank; Service accepts name parameter; Controller passes name to service; Entity defines NOT NULL name with correct unique constraint; Migration uses DEFAULT '' → DROP DEFAULT pattern (safe for existing rows); EngagementDto and EngagementDashboardDto include name field; All test mocks updated with name parameter; No null pointer risks or data loss"

- group: 2
  attempt: 1
  scores:
    spec: 100
    runtime: 100
    code: 95
  total: 99
  status: PASS
  findings:
    - "spec: All SHALL requirements met — POST accepts name with @NotBlank validation; PATCH transitions via {id} not {taxYear}; note field persisted and returned; 404 for unknown id; GET history ordered oldest-first by changed_at; ownership check prevents cross-client access"
    - "runtime: All 27 tests pass (15 ControllerTest, 3 DataJpaTest, 9 EmailTest); controller tests verify blank name → 400, duplicate name same year → 409, multi-name same year → 201, status transition with/without note, unknown id → 404, history ordering; email notifications work in EN/ZH; no regressions"
    - "code: CreateEngagementRequest @NotBlank name; Service createEngagement() accepts name, sets entity; transitionStatus() finds by {id}, checks ownership (engagement.getClientId().equals(clientId)), sets note; getHistory() finds by {id}, checks ownership; exception mapped to 404; DTOs include name/note; tests use correct stubs (findById not findByClientIdAndTaxYear); no null pointers, no data loss, no security gaps"

- group: 3
  attempt: 1
  scores:
    spec: 100
    runtime: 100
    code: 95
  total: 99
  status: PASS
  findings:
    - "spec: All three SHALL requirements verified — (1) New Engagement dialog confirm button disabled on blank name via [disabled]=\"!name.trim()\"; (2) Change Status dialog note textarea pre-filled from engagement.note via `note = this.data.engagement.note ?? ''`; (3) Updated note saved on submit via dialogRef.close() passing note to transitionStatus() which includes it in PATCH payload"
    - "runtime: All 23 tests pass across 4 test files (admin-new-engagement-dialog, admin-transition-dialog, admin-client-workflow, admin-workflow); no regressions; submit-disabled test, note-prefilled test, note-send test, and service URL engagement-id tests all passing"
    - "code: New Engagement dialog uses mat-form-field + matInput for name field (never bare input); engagement.service.ts methods correctly use engagementId parameter in URLs (getEngagementHistory, transitionStatus replace taxYear with engagement.id); admin-client-workflow.component.ts passes engagement.id throughout (lines 70, 120, 125); dialog data injection properly receives full EngagementDto; Zoneless change detection compliant (no Zone.js, uses inject(), signals); models updated with name/note fields. Minor: note textarea in admin-transition-dialog is bare (not wrapped in mat-form-field like name field), but functionally correct and tests pass; this is a style inconsistency, not a contract violation"
  fix_tasks: []

- group: 4
  attempt: 1
  scores:
    spec: 95
    runtime: 100
    code: 92
  total: 96.4
  status: PASS
  findings:
    - "spec: Both scenarios fully satisfied — engagements render with name, taxYear, status; multiple engagements for same tax year (2025) are unambiguously identifiable by distinct names ('John Smith' vs 'Smith Holdings Inc.'). Component correctly displays all three required fields in each row."
    - "runtime: All 6 frontend tests pass (portal-engagements.component.spec.ts); tests cover: single/multiple row rendering, name/taxYear/status display, same-year distinct-name scenario, empty state"
    - "code: EngagementDto.name present in backend Java record and TypeScript interface; zoneless compliant (signal(), inject(), no Zone.js); service calls correct /api/me/engagements URL; backend listForPortalUser() safely uses findByUserId() → findByClientIdOrderByTaxYearDesc() → toDto mapping with all required fields; no new API calls required per contract; clean null handling with orElse(List.of()). Minor: MeEngagementControllerTest.java not found, but not strictly required by contract which specifies frontend test as runtime verification."
  fix_tasks: []
