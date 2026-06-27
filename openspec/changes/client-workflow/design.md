## Context

The app currently tracks clients as flat records (name, email, phone, admin ownership). There is no concept of a tax engagement lifecycle — filing status exists only in staff email threads. This design introduces a `ClientEngagement` entity (one per client per tax year) with a five-state machine and a full transition audit trail, plus the admin UI surfaces to manage it.

Existing patterns to follow:
- Backend: Controller → Service → Repository → Domain (Spring Data JPA). Enums stored as `VARCHAR` with `@Enumerated(EnumType.STRING)`.
- Frontend: standalone Angular components, zoneless (`provideZonelessChangeDetection()`), `HttpClient` with `CredentialsInterceptor`, Angular Material, signal-based state.
- Email: Spring Mail via `JavaMailSender`. See `ContactService` for the existing send pattern.
- Auth: admin-only endpoints guarded at the Spring Security level (`hasRole('ADMIN')`) and at the route level (`adminGuard`).

## Goals / Non-Goals

**Goals:**
- Add `businessType` and `fiscalYearEndMonth/Day` to the `Client` entity.
- Introduce `ClientEngagement` (status) and `ClientEngagementHistory` (audit trail) entities.
- Provide REST endpoints so the admin portal can create engagements, transition status, and retrieve history.
- Send bilingual (EN/ZH) email notifications on four status transitions.
- Deliver two frontend surfaces: `/admin/workflow` dashboard table and a Workflow tab on client detail.

**Non-Goals:**
- Client-portal visibility of engagement status.
- Automated state transitions or timer-driven advancement.
- CRA API integration.
- Multi-admin task assignment.

## Decisions

### Decision 1 — No external workflow engine

**Choice**: Custom enum state machine in the service layer.

**Rationale**: Five states, admin-only transitions, no parallel paths or timers. A BPMN engine (Flowable, Camunda) or Spring State Machine adds >1 dependency and 10× the surface area for no runtime benefit. A `ClientEngagementService.transitionStatus()` method that validates, persists, and fires a side-effect email is the entire state machine. Transition validation is trivially "any → any" per requirements, so no guard logic is needed at all.

**Alternative considered**: Spring State Machine — rejected because it adds a dependency and requires learning SSM-specific abstractions (guards, transitions, regions) that add complexity without adding capability here.

---

### Decision 2 — Fiscal year end stored as month + day integers

**Choice**: Two nullable `SMALLINT` columns on `clients`: `fiscal_year_end_month` (1–12) and `fiscal_year_end_day` (1–31). For PERSONAL clients these are always stored as 12 / 31 (server-enforced, not nullable). For CORPORATE and SELF_EMPLOYED they are set by the admin and validated server-side using `java.time.MonthDay.of(month, day)` — which throws `DateTimeException` on invalid dates (e.g., Feb 30).

**Rationale**: A fiscal year end recurs annually — storing a full `DATE` would imply a specific year. Month + day cleanly represents the recurring date without year ambiguity. `java.time.MonthDay` provides built-in calendar validation with no extra logic.

**Alternative considered**: Storing as `VARCHAR(5)` in "MM-DD" format — rejected because integer columns are cheaper to index and compare, and parsing is not required.

---

### Decision 3 — Tax year is the year the fiscal period ends

**Choice**: `tax_year SMALLINT` on `client_engagements` represents the calendar year in which the client's fiscal period closes. For a Dec 31 personal client, 2024 = Jan 1–Dec 31 2024. For a March 31 corporate, 2025 = April 1 2024–March 31 2025.

**Rationale**: This matches CRA's own convention for identifying tax years and avoids ambiguity in the UI ("which year does this engagement belong to?").

---

### Decision 4 — Audit history as a separate table

**Choice**: `client_engagement_history` table, one row per transition, FK to `client_engagements` with CASCADE DELETE. The `from_status` is nullable (NULL for the initial START entry).

**Rationale**: Storing history in the engagement row itself (e.g., a JSON blob) would make querying and displaying the timeline difficult. A separate table keeps each event as a first-class row — easy to query, paginate, and display chronologically.

---

### Decision 5 — Email templates inlined in Java (not external files)

**Choice**: Email body assembled in the service layer using a switch on `EngagementStatus` and `language`. Four states × two languages = 8 template strings, kept as constants or a private helper method in `ClientEngagementService`.

**Rationale**: Eight short strings do not warrant a Thymeleaf template engine or external `.html` files. The existing `ContactService` sends email via `SimpleMailMessage` with a string body — match that pattern for consistency.

**Alternative considered**: Thymeleaf HTML email templates — deferred. Plain-text emails are sufficient now; HTML formatting can be added in a future change without touching the spec.

---

### Decision 6 — Dashboard endpoint returns all engagements in a flat list

**Choice**: `GET /api/admin/engagements` returns all `ClientEngagement` rows joined with `Client` (for name, businessType) and `User` (for updatedByName). No pagination in the initial implementation.

**Rationale**: The admin dashboard needs a flat table. The number of engagements for a single-firm app is small enough that a full-list response is acceptable. Pagination can be added in a future change if needed.

**Risk**: If the firm grows to thousands of clients over many years this endpoint becomes slow. Mitigation: add pagination or server-side filtering (status, businessType) in the query using Spring Data JPA `Specification` — the endpoint signature is already filter-friendly.

---

### Decision 7 — Frontend workflow tab on client detail as a new tab alongside existing views

**Choice**: Add a "Workflow" `mat-tab` to the existing admin client detail area. The tab loads engagements lazily on first activation.

**Rationale**: The client detail already has documents and messages tabs (inferred from routes `/admin/clients/:id/documents` and `/admin/clients/:id/messages`). A workflow tab is a natural addition following the same pattern.

---

### Decision 8 — Status transition note collected via a confirmation dialog

**Choice**: When the admin changes an engagement's status in the UI, a small Angular Material dialog appears asking for an optional note before the PATCH is sent.

**Rationale**: Forcing a dialog (rather than inline text input) prevents accidental status changes and gives the admin a moment to add context. The note field is optional so it does not slow down routine transitions.

## Risks / Trade-offs

- **Email delivery failure on status transition** → Mitigation: catch mail exceptions in the service layer, log the error, and allow the status transition to succeed regardless. Email delivery is best-effort; the admin can resend manually.
- **Client has no linked user — no email target** → Handled explicitly: service checks `client.userId` is non-null before attempting email; no error is thrown.
- **Fiscal year end validation only on server** → Frontend should mirror the validation (disable submit if month+day is invalid) to give immediate feedback, but the server is the source of truth.
- **`GET /api/admin/engagements` returns all rows** → Acceptable now; add Spring Data JPA `Specification`-based filtering in a follow-up change if the table grows large.

## Migration Plan

Two Flyway migrations, applied in order on deploy:

1. **V13__add_business_type_to_clients.sql** — adds `business_type VARCHAR(20) NOT NULL DEFAULT 'PERSONAL'`, `fiscal_year_end_month SMALLINT NOT NULL DEFAULT 12`, `fiscal_year_end_day SMALLINT NOT NULL DEFAULT 31`. Defaults ensure existing rows pass the NOT NULL constraint without a backfill step.

2. **V14__create_client_engagements.sql** — creates `client_engagements` (with UNIQUE on `(client_id, tax_year)`) and `client_engagement_history` (FK CASCADE DELETE to `client_engagements`).

**Rollback**: Drop V14 tables, then drop the three V13 columns. Flyway does not support automatic rollback — the SQL to undo each migration should be kept in a rollback script alongside the migration files.

**Existing client records**: After V13, all existing clients will have `business_type='PERSONAL'`, `fiscal_year_end_month=12`, `fiscal_year_end_day=31`. Admin can edit each client to set the correct business type and FYE once the feature is deployed.

## Open Questions

_None — all design decisions resolved._
