## Context

The current `client_engagements` table enforces a unique constraint on `(client_id, tax_year)`, making it impossible to track multiple filings for the same client in the same year (e.g., a personal return and a corporation). The engagement entity has no name or note fields. All engagement routes use `taxYear` as a path identifier, which works only while the uniqueness constraint holds.

Backend: Spring Boot 3.5, Spring Data JPA, PostgreSQL with Flyway. Frontend: Angular 21 (zoneless), Angular Material.

## Goals / Non-Goals

**Goals:**
- Allow multiple engagements per client per tax year by replacing the unique constraint
- Add `name` (mandatory) and `note` (mutable) to engagements
- Switch engagement detail routes from `{taxYear}` to `{id}`
- Surface name in admin and client portal UI

**Non-Goals:**
- Audit trail for note changes
- Auto-populating name from client data
- Email notification changes

## Decisions

### 1. New unique constraint: `(client_id, tax_year, name)`

**Chosen:** Drop `UNIQUE(client_id, tax_year)`, add `UNIQUE(client_id, tax_year, name)`.

**Alternatives considered:**
- No uniqueness constraint at all — rejected: allows accidental duplicate names for the same client/year, which would confuse the UI.
- Unique on `(client_id, name)` across all years — rejected: a business name can legitimately recur across years.

**Rationale:** The name is the human-readable differentiator within a client/year pair. Enforcing uniqueness there prevents accidents without being overly restrictive.

### 2. Route parameter: `{id}` (Long) instead of composite key

**Chosen:** Switch all single-engagement routes from `{taxYear}` to `{id}`.

**Alternatives considered:**
- Composite path `{taxYear}/{name}` — rejected: URL-encoding business names is fragile and ugly.
- Query param `?engagementId=` — rejected: inconsistent with REST conventions already in use.

**Rationale:** The engagement ID is already the primary key; using it as the path param is the simplest and most idiomatic approach.

### 3. Note update tied to Change Status

**Chosen:** `PATCH /{id}/status` accepts `{ status, note }`. The `note` value replaces `ClientEngagement.note` and is also written to `ClientEngagementHistory.note` for the history entry.

**Alternatives considered:**
- Separate `PATCH /{id}/note` endpoint — rejected: the user requirement states the note is updated "in Change Status"; a separate endpoint adds complexity without a stated need.
- Allow same-status transition to update note — not needed; every Change Status action picks a status (even if unchanged).

**Rationale:** Keeping the note update co-located with the status transition keeps the API surface minimal and matches the UX.

### 4. Migration strategy for existing data

**Chosen:** `V15__add_name_note_to_engagements.sql` adds `name` with a temporary `DEFAULT ''`, drops the old constraint, adds the new one, then drops the default.

**Rationale:** Existing engagements (if any) get an empty string name, satisfying NOT NULL. The new unique constraint `(client_id, tax_year, name)` is satisfied as long as no two existing rows share the same `(client_id, tax_year)` — which is guaranteed by the old constraint. The default is dropped immediately so future inserts must supply a name.

## Risks / Trade-offs

- **[BREAKING route change]** Any bookmarked or hardcoded URLs using `{taxYear}` in engagement detail or history paths will break. → Accepted by stakeholder; no external consumers of these URLs.
- **[Empty name on migration]** Existing rows get `name = ''`, which satisfies NOT NULL but is not meaningful. → Acceptable in dev/staging; production data should be reviewed and updated manually if needed before deploying.
- **[Note is not audited]** Clearing the engagement note loses the previous value permanently (history entries capture the note at each transition, but a note-only edit via a no-op transition is not supported). → Accepted per requirements; audit trail for notes is out of scope.

## Migration Plan

1. Deploy the Flyway migration `V15` — adds columns and swaps constraints. Non-destructive; existing rows get `name = ''`.
2. Deploy backend — new fields in entity, DTOs, service, and controller. Route `{taxYear}` → `{id}` is a breaking change; ensure frontend is deployed atomically or in the same release.
3. Deploy frontend — updated dialogs and portal view.
4. **Rollback:** Drop V15 migration columns and restore old constraint via a new V16 migration (Flyway does not support rollback natively). Backend and frontend rollback to prior version.

## Open Questions

- None — all decisions resolved before tasks generation.
