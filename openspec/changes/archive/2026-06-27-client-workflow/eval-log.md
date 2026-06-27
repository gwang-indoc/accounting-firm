# Eval Log — client-workflow

<!-- Appended by evaluator subagent after each N.E EVAL run -->

- group: 1
  attempt: 1
  scores: {spec: 100, runtime: 100, code: 100}
  total: 100
  status: PASS
  findings:
    - "spec: All 5 SHALL statements fully implemented and verified"
    - "runtime: ClientBusinessTypeTest 3/3 passing; 273 total tests with 0 new failures; 3 pre-existing failures unrelated to this change"
    - "code: Proper Flyway versioning, enum declared with 3 values, MonthDay validation for calendar dates, GlobalExceptionHandler integration for 400 responses, DTOs properly include both FYE fields"
  fix_tasks: []

- group: 2
  attempt: 1
  scores: {spec: 100, runtime: 100, code: 70}
  total: 94
  status: PASS
  findings:
    - "spec: All 11 SHALL statements fully implemented — create, duplicate-prevention, list, transition, history (with nullable from_status), list-all, auth"
    - "runtime: 18/18 tests passing (2 data layer + 11 controller + 5 security); no failures"
    - "code: HIGH SEVERITY — listAll() method has N+1 query antipattern; fetches all engagements then loops to findById(clientId) and findById(updatedBy) for each, resulting in 1+2N queries. For dashboard with 100 engagements = 201 queries. Should use JOIN or custom query"
    - "code-positive: Proper ForeignKey constraint with ON DELETE CASCADE; UNIQUE(client_id, tax_year) enforced; transaction boundaries correct; exception handlers integrated; auth via /api/admin/** path prefix safe; no SQL injection or deserialization risks"
  fix_tasks:
    - "2.F1 FIX — Replace listAll() with JOIN query to fetch Client.name, BusinessType, User.name in single query instead of N+2N separate lookups"

- group: 3
  attempt: 1
  scores: {spec: 100, runtime: 100, code: 95}
  total: 99
  status: PASS
  findings:
    - "spec: All 6 SHALL statements fully satisfied — sends email on IN_PROCESSING, PENDING_CLIENT_REVIEW, SUBMIT_TO_CRA, COMPLETED; language matches preference; no email for START; no email if no linked user; failure does not block transition"
    - "runtime: 11/11 tests passing (1 IN_PROCESSING EN, 1 IN_PROCESSING ZH, 1 START no-send, 1 no-linked-user, 1 MailException swallowed, 2 PENDING_CLIENT_REVIEW variants, 2 SUBMIT_TO_CRA variants, 2 COMPLETED variants)"
    - "code: Excellent null safety with proper checks at each lookup (client, userId, user); MailException caught and logged without propagation; no email header injection risk; language defaults to EN if null; bilingual templates inline but clear; transaction boundary correct (send is non-Transactional method)"
    - "code-minor: English/Chinese language detection uses string comparison twice ('en'.equals(lang)) when could use ternary after initial assignment (line 121, 124, etc.) — minor code cleanliness issue, not a defect"
  fix_tasks: []

- group: 4
  attempt: 1
  scores: {spec: 100, runtime: 100, code: 88}
  total: 97.6
  status: PASS
  findings:
    - "spec: All 6 SHALL statements fully implemented — /admin/workflow route with authGuard+adminGuard, table with all 6 columns (Client Name, Business Type, Tax Year, Status, Last Updated, Last Updated By), filters by Status and Business Type using computed(), navbar link, dialog includes businessType + conditional FYE fields"
    - "runtime: 14/14 tests passing (6 admin-workflow + 8 admin-client-dialog); 2 test files, 0 failures; all filter scenarios and FYE visibility tests pass"
    - "code: Proper signal-based reactivity with computed() filter logic; standalone zoneless components; Material Design form fields; EngagementService wraps GET /api/admin/engagements; no XSS (Angular auto-escapes), no SQL injection (encodeURIComponent), auth guards in place; FormGroup properly manages businessType → FYE validator coupling via constructor subscription + updateValueAndValidity()"
    - "code-minor: FYE field validation missing Validators.max(12) for month and Validators.max(31) for day (mitigated by HTML max attribute); type cast 'as any' on businessType/FYE fields (should be safe cast); ngModel with signals redundantly calls .set() (functional but suboptimal); updatedAt timestamp not formatted (displays ISO string)"
  fix_tasks:
    - "4.F1 OPTIONAL — Add Validators.max(12) to fiscalYearEndMonth and Validators.max(31) to fiscalYearEndDay in constructor validation setup for belt-and-suspenders form validation"
    - "4.F2 OPTIONAL — Replace type cast '(this.data.client as any)?.businessType' with safe cast or interface assertion to eliminate 'as any' code smell"
    - "4.F3 OPTIONAL — Format updatedAt timestamp with Angular date pipe (e.g., {{e.updatedAt | date:'short'}}) for user-friendly display"

- group: 5
  attempt: 1
  scores: {spec: 100, runtime: 0, code: 0}
  total: 40
  status: BLOCK
  findings:
    - "spec: All 5 SHALL statements fully met — Workflow tab on client detail, engagement list with tax year descending, expandable rows with history, new engagement dialog, 409 duplicate rejection, status transition dialog with optional note"
    - "runtime: BLOCKED — Tests fail with 'Cannot configure the test module when the test module has already been instantiated' error; indicates inject() called before TestBed.configureTestingModule(); 0/9 tests execute; test harness error prevents evaluation"
    - "code: HIGH SEVERITY — Nested subscriptions in openTransitionDialog (lines 87-96) chain 3 HTTP calls without error handlers; inner failures silent; violates reactive patterns, should use switchMap+tap. Unsubscribed streams in loadEngagements(), toggleExpand(), submitNewEngagement() — no takeUntilDestroyed() or component.OnDestroy; memory leak risk. Test timing fragility: dialog assertions check HTTP calls immediately after openNewEngagementDialog() but calls happen async inside afterClosed().subscribe() — tests pass due to mock synchrony but are flaky."
    - "code-minor: Unused MatSelectModule import line 5 (transition dialog imports it correctly); no error feedback on loadEngagements() failure (silent); no success toast on new engagement or status transition; no loading state (buttons can be clicked multiple times during submission); history fetch inefficiency (no per-tax-year cache, acceptable as-is)"
  fix_tasks:
    - "5.F1 FIX — Fix TestBed setup: move all inject() calls out of the setup() function body into a separate describe-scoped beforeEach or remove inject() and use TestBed.inject() instead; configure TestBed before any injection"
    - "5.F2 FIX — Replace nested subscribe chain in openTransitionDialog with switchMap+tap pattern; add error handlers to inner streams; emit toast/snackbar on error"
    - "5.F3 FIX — Add takeUntilDestroyed() to all subscriptions; add OnDestroy hook for safety in case takeUntilDestroyed() is missed; inject DestroyRef"
    - "5.F4 FIX — Rewrite dialog test mocks to properly simulate async behavior using fakeAsync/tick or convert to proper Promise/Observable-based assertions instead of synchronous checks"
    - "5.F5 OPTIONAL — Add error toast on loadEngagements failure; add success toast on new engagement and status transition; disable buttons during submission (set boolean flag in next/error handlers)"
    - "5.F6 OPTIONAL — Remove unused MatSelectModule from main component imports (line 5)"

- group: 5
  attempt: 2
  scores: {spec: 100, runtime: 100, code: 72}
  total: 94.4
  status: PASS
  findings:
    - "spec: All 5 SHALL statements fully implemented and verified — Workflow tab route `/admin/clients/:id/workflow` with guard; backend query returns engagements orderByTaxYearDesc; expandable rows display history; new engagement dialog creates entry at START status; status transition sends PATCH with optional note; duplicate 409 response triggers UI error message"
    - "runtime: 9/9 tests PASSING (engagement list renders, status shown, empty state displayed, fetches for correct clientId, expand shows history, new engagement dialog calls createEngagement, duplicate error displays, transition dialog calls transitionStatus); TestBed setup fixed — configureTestingModule called before component creation"
    - "code: Duplicate code — submitNewEngagement (lines 76-88) unreachable and mirrors openNewEngagementDialog (lines 57-74), should remove. Nested subscribe in openTransitionDialog tap() at lines 105-108 gets history in side-effect chain (mitigated by takeUntilDestroyed but unconventional). Missing error handler on loadEngagements (lines 39-41) — silent failure if API returns 401/500. Type safety: filter checks !!result which allows undefined note (dialog sends null, but intermediate states could pass undefined). Tax year validation accepts zero/negative (lines 31, not validated). selectedStatus could be undefined edge case (unlikely as filter ensures at least one status exists). Note display uses @if (h.note) instead of explicit null check. All takeUntilDestroyed() now present, TestBed setup fixed"
    - "code-positive: Proper signal-based reactivity (engagements, expandedId, duplicateError); standalone zoneless components; Material Dialog properly passes data; switchMap used for new engagement dialog chain; takeUntilDestroyed on critical paths; auth guards in app.routes; no XSS/SQL injection; proper TypeScript types on all signal values"
  fix_tasks:
    - "5.F1 OPTIONAL — Remove unreachable submitNewEngagement method (lines 76-88) and its unused duplicate error handling; consolidate into single dialog-driven flow"
    - "5.F2 OPTIONAL — Add error handler to loadEngagements subscription (line 39) to show error toast if API fails (401, 500, network); prevents silent failure"
    - "5.F3 OPTIONAL — Add form validation to tax year input (no zero, no negative, reasonable upper bound ~2099); prevent invalid submissions"
    - "5.F4 OPTIONAL — Refactor history fetch into switchMap chain instead of nested subscribe in tap() for consistency with reactive patterns"
