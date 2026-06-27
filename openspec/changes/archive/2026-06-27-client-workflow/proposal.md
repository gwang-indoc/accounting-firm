---
Date: 2026-06-26
Change: client-workflow
Requirements: requirements.md
---

## Why

The firm currently has no structured way to track where each client's tax return stands in the annual filing cycle — work state lives only in email threads and staff memory. Introducing a formal per-client, per-tax-year engagement workflow gives the admin a single source of truth for filing status, drives client-facing milestone emails automatically, and creates an auditable history of every status change.

## What Changes

- **Client record extended** with `businessType` (PERSONAL / CORPORATE / SELF_EMPLOYED) and `fiscalYearEndMonth` / `fiscalYearEndDay` (fixed Dec 31 for PERSONAL; admin-set for others).
- **New `ClientEngagement` entity** — one row per client per tax year (year = year the fiscal period ends), tracking the engagement's current status.
- **New `ClientEngagementHistory` entity** — full audit trail of every status transition (from → to, admin, timestamp, optional note).
- **State machine** — five states (START, IN_PROCESSING, PENDING_CLIENT_REVIEW, SUBMIT_TO_CRA, COMPLETED); any state can transition to any other; admin-only.
- **Email notifications** — bilingual (EN/ZH) emails sent to the client's linked user when status moves to IN_PROCESSING, PENDING_CLIENT_REVIEW, SUBMIT_TO_CRA, or COMPLETED; language chosen from `users.language`.
- **Admin workflow dashboard** — new `/admin/workflow` route with a table of all engagements across all years, filterable by status and business type.
- **Client detail — Workflow tab** — per-client view of all engagements with expandable transition history and notes.

## Capabilities

### New Capabilities

- `client-engagement-workflow` — backend: ClientEngagement + ClientEngagementHistory entities, state machine service, REST endpoints, bilingual email notifications
- `admin-workflow-ui` — frontend: `/admin/workflow` dashboard table + Workflow tab on client detail

### Modified Capabilities

- `client-management` — delta spec adds `businessType`, `fiscalYearEndMonth`, `fiscalYearEndDay` fields to client create/edit; fiscal year end is read-only for PERSONAL clients

## Impact

- **Backend — new entities & migrations**: `V13__add_business_type_to_clients.sql`, `V14__create_client_engagements.sql` (includes both `client_engagements` and `client_engagement_history`)
- **Backend — new classes**: `BusinessType` enum, `EngagementStatus` enum, `ClientEngagement`, `ClientEngagementHistory`, `ClientEngagementRepository`, `ClientEngagementHistoryRepository`, `ClientEngagementService`, `ClientEngagementController`, DTOs
- **Backend — modified classes**: `Client` entity (new fields), `CreateClientRequest` / `UpdateClientRequest` DTOs, `ClientDto`
- **Backend — email**: new email templates (EN + ZH) for four notification states; uses existing Spring Mail infrastructure
- **Frontend — new**: `AdminWorkflowComponent` (`/admin/workflow`), engagement service, workflow tab on admin client detail
- **Frontend — modified**: `AdminClientDialogComponent` (business type + FYE fields), navbar / sidebar (workflow link), routes
- **No breaking API changes** to existing client endpoints; new fields are additive

## Out of Scope

- Client-initiated status transitions (deferred — not planned)
- Automated/timer-driven state advancement (deferred — not planned)
- CRA API integration (deferred — not planned)
- Multi-admin assignment or task queuing per engagement (deferred — not planned)
- Client portal visibility of engagement status (deferred to a future `client-portal-workflow` change)
