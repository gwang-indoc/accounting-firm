## 1. Backend — activeEngagementStatus on ClientDto

### Contract
- **Spec**: From `specs/client-management/spec.md` (MODIFIED "List all clients") —
  - "Each client in the response SHALL include `activeEngagementStatus` — the status of the most recent non-COMPLETED engagement by tax year for that client; if all engagements are COMPLETED the field is COMPLETED; if the client has no engagements the field is null."
  - Scenario: activeEngagementStatus reflects latest active engagement — WHEN a client has engagements in multiple statuses including at least one non-COMPLETED, THEN the returned `activeEngagementStatus` is the status of the most recent non-COMPLETED engagement by tax year.
  - Scenario: activeEngagementStatus is null for client with no engagements — WHEN a client has no engagements, THEN the returned `activeEngagementStatus` is null.
  - Scenario: activeEngagementStatus falls back to COMPLETED when all engagements are done — WHEN a client's engagements are all at status COMPLETED, THEN the returned `activeEngagementStatus` is COMPLETED.
- **Runtime**: `cd backend && ./mvnw test` → new `ClientServiceTest` cases for all 4 status scenarios pass; existing controller and service tests unaffected
- **Code**: D1 — compute activeEngagementStatus server-side in `ClientService.findAll()` via JPQL (correlated subquery or left join): find highest taxYear engagement per client where status != COMPLETED; fall back to highest taxYear if none found; D2 — add nullable field to existing `ClientDto` Java record (no new DTO)
- **Threshold**: 80

- [x] 1.0 CONTRACT — write `openspec/changes/workflow-to-client-mgmt/contracts/group-1.md` with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [x] 1.1 RED — in `ClientServiceTest`, add 4 failing tests for `findAll()` response: (a) client with no engagements → `activeEngagementStatus` is null; (b) client with one non-COMPLETED engagement → that status; (c) client with all COMPLETED engagements → COMPLETED; (d) client with mixed engagements (some COMPLETED, some not) → latest non-COMPLETED status by tax year
- [x] 1.2 GREEN — add `activeEngagementStatus` (`EngagementStatus` nullable) to `ClientDto.java`; update `ClientService.findAll()` to compute it via a JPQL query in the engagement repository; make 1.1 tests pass
- [x] 1.3 RED — in `ClientControllerTest`, add a test verifying that `GET /api/clients` returns `activeEngagementStatus` in each client JSON object
- [x] 1.4 GREEN — ensure controller test passes (no extra impl needed if 1.2 is correct; verify serialization)
- [x] 1.5 — update `docs/log/2026-06-27.md` with progress on backend activeEngagementStatus
- [x] 1.E EVAL — spawn evaluator subagent (haiku); reads `contracts/group-1.md` + `specs/client-management/spec.md` + `design.md` + group-1 diff; invokes `superpowers:requesting-code-review` (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 2. Frontend — client list enhancements + navbar

### Contract
- **Spec**: From `specs/client-management/spec.md` —
  - Workflow state column: "The system SHALL display an `activeEngagementStatus` column in the admin client list table. The column SHALL render the status string for clients with engagements, and '—' for clients with null `activeEngagementStatus`."
  - Workflow state filter: "The system SHALL provide a 'Workflow State' dropdown filter above the client list table. The filter SHALL offer options: All, START, IN_PROCESSING, PENDING_CLIENT_REVIEW, SUBMIT_TO_CRA, COMPLETED, and '— None —' (clients with no engagements). Filtering is applied client-side and resets pagination to page 1."
  - Workflow action: "The system SHALL display a 'Workflow' action button in each client row. Clicking the button SHALL navigate the admin to `/admin/clients/:id/workflow` for that client."
  - From `specs/admin-workflow-ui/spec.md` — Scenario: Workflow nav link absent for admins — WHEN an authenticated admin views any page in the admin portal, THEN the navbar does NOT include a "Workflow" navigation link.
- **Runtime**: `cd frontend && npx ng test --no-watch` → new tests for column rendering, filter scenarios (status, None, All), pagination reset, and Workflow button navigation pass; navbar test for absent Workflow link passes; all existing client list and navbar tests unaffected
- **Code**: D3 — add `workflowStateFilter = signal<string>('')` to `AdminClientsComponent`; extend `filteredClients` computed; use `'__none__'` sentinel for "— None —"; D4 — add `openWorkflow(client)` using `this.router.navigate`; no routerLink directive (consistent with `openDocuments`/`openMessages`)
- **Threshold**: 80

- [x] 2.0 CONTRACT — write `openspec/changes/workflow-to-client-mgmt/contracts/group-2.md` with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [x] 2.1 RED — in `admin-clients.component.spec.ts`, add failing tests for: (a) Workflow State column renders status text for client with engagement; (b) column renders "—" for client with null `activeEngagementStatus`; (c) filtering by a specific status shows only matching clients; (d) filtering by `'__none__'` shows only null-status clients; (e) filtering by `''` (All) shows all clients; (f) changing the filter resets page to 1; (g) clicking the Workflow button calls `router.navigate` with the correct path
- [x] 2.2 GREEN — add `activeEngagementStatus: EngagementStatus | null` to the Angular `ClientDto` interface; add `workflowStateFilter` signal and `openWorkflow()` to `AdminClientsComponent`; extend `filteredClients` computed to include workflow state filter logic; update template with Workflow State column and Workflow action button; add workflow state filter dropdown above the table
- [x] 2.3 RED — in the navbar component spec (or a dedicated spec), add a failing test verifying the "Workflow" nav link is NOT rendered for an admin user
- [x] 2.4 GREEN — remove the "Workflow" `<a mat-button routerLink="/admin/workflow">` link from `navbar.component.html`; make 2.3 test pass
- [x] 2.5 — update `docs/log/2026-06-27.md` with progress on frontend client list and navbar changes
- [x] 2.E EVAL — spawn evaluator subagent (haiku); reads `contracts/group-2.md` + `specs/client-management/spec.md` + `specs/admin-workflow-ui/spec.md` + `design.md` + group-2 diff; invokes `superpowers:requesting-code-review` (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 3. E2E + final verification

- [x] 3.1 Run backend test suite — `cd backend && ./mvnw test`; confirm all pass
- [x] 3.2 Run frontend test suite — `cd frontend && npx ng test --no-watch`; confirm all pass
- [x] 3.3 Write a Playwright e2e test in `e2e/` that: (a) logs in as admin; (b) opens the client list; (c) verifies the Workflow nav link is absent from the navbar; (d) verifies the Workflow State column exists; (e) clicks a Workflow action button and asserts navigation to the per-client workflow page
- [x] 3.4 Run e2e suite — `cd e2e && npx playwright test`; confirm new test passes
- [x] 3.5 Update `docs/log/2026-06-27.md` with completion notes
- [x] 3.6 Run `/security-review` on the branch diff; address Critical/High/Medium findings before proceeding
- [x] 3.7 Run `superpowers:verification-before-completion`
