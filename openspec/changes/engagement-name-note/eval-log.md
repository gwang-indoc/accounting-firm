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

