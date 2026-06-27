## Context

The admin area currently has two separate nav items: "Client Management" (`/admin/clients`) and "Workflow" (`/admin/workflow`). The Workflow page is a global engagement dashboard; the per-client workflow page (`/admin/clients/:id/workflow`) already exists but is not linked from the client list. This change merges the entry points: the client list becomes workflow-aware, and the global Workflow nav link is removed.

Current data shape: `ClientDto` (Java record and Angular model) carries no engagement state. The global dashboard fetches all engagements from a separate endpoint (`GET /api/admin/engagements`). The per-client workflow page fetches per-client engagements on demand.

## Goals / Non-Goals

**Goals:**
- Add `activeEngagementStatus` to `ClientDto` so a single `GET /api/clients` call returns enough to render the new column.
- Add Workflow State filter and column to the Angular client list component.
- Remove the Workflow nav link from the navbar.

**Non-Goals:**
- Server-side filtering by engagement status (the client list is small enough for client-side filtering, consistent with the existing name/email filters).
- Removing the `/admin/workflow` route or its component.
- Any change to engagement creation, transitions, or history.

## Decisions

### D1 — Compute `activeEngagementStatus` server-side in the list query

**Decision:** Add `activeEngagementStatus` to `ClientDto` and compute it in `ClientService.findAll()` via a JPQL query or a dedicated `@Query` on the repository.

**Alternatives considered:**
- *Frontend join from two API calls* (`GET /api/clients` + `GET /api/admin/engagements`): works but doubles the request count on every client list load, and the frontend would need to implement the "latest non-COMPLETED" logic. Rejected — server-side is cleaner and more efficient.
- *New dedicated endpoint* (`GET /api/clients/with-status`): avoids touching the existing endpoint's contract. Rejected — adds a second endpoint for essentially the same resource; enriching the existing response is lower friction and all existing callers only see a new nullable field.

**Implementation note:** The query should find, per client, the engagement with the highest `taxYear` that is not `COMPLETED`. If none exists, it should fall back to the highest `taxYear` regardless of status (which will be `COMPLETED`). Null if no engagements at all. A correlated subquery or a LEFT JOIN LATERAL is the natural fit; a JPQL approach with `@Query` in the engagement repository is preferred to keep the JPA layer consistent.

### D2 — `activeEngagementStatus` as nullable field on existing `ClientDto`

**Decision:** Add `activeEngagementStatus: EngagementStatus | null` to the existing `ClientDto` Java record and the Angular `ClientDto` interface. No new DTO is introduced.

**Alternatives considered:**
- *New `ClientSummaryDto`*: cleaner separation but requires changing the service, controller, and Angular service call. Rejected — the field is a natural addition to the summary and changing the DTO is simpler.

**Backward compatibility:** The field is nullable (null when no engagements). Existing callers that ignore unknown fields are unaffected. Angular's `HttpClient` JSON deserialization is tolerant of new fields.

### D3 — Client-side filter using existing signal/computed pattern

**Decision:** Add a `workflowStateFilter = signal<string>('')` to `AdminClientsComponent` and extend the existing `filteredClients` computed to also check `activeEngagementStatus`. The value `'__none__'` is used as the sentinel for "— None —" (clients with null status), distinct from `''` (All).

**Rationale:** Consistent with the existing `nameFilter` and `emailFilter` signals. No new abstraction needed.

### D4 — Workflow action button uses `router.navigate`, not `routerLink`

**Decision:** Add an `openWorkflow(client: ClientDto)` method that calls `this.router.navigate(['/admin/clients', client.id, 'workflow'])`, consistent with the existing `openDocuments` and `openMessages` methods.

## Risks / Trade-offs

- [Performance: `activeEngagementStatus` adds a subquery per client row in the list response] → The client list is scoped per admin (`admin_id` filter) and admins typically manage tens to low hundreds of clients. A correlated subquery at this scale is not a concern. Index on `(client_id, status, tax_year)` on `client_engagements` will keep it fast if row counts grow.
- [Backward compatibility: enriching `ClientDto` changes the wire format] → The new field is nullable. Any consumer that uses Jackson's default deserialization (unknown fields ignored) is unaffected. The only Angular consumer is `AdminClientsService`, which we control.
- [The global `/admin/workflow` page becomes orphaned] → Acceptable; it stays functional at its URL and cleanup is deferred. No broken links result from removing only the navbar entry.

## Migration Plan

1. Backend: add `activeEngagementStatus` to `ClientDto` record + update `ClientService.findAll()`. No Flyway migration needed — no schema change.
2. Frontend: update `ClientDto` interface → update `AdminClientsComponent` → update navbar.
3. Rollback: revert backend to drop the field; revert frontend. No data migration involved.

## Open Questions

_(none)_
