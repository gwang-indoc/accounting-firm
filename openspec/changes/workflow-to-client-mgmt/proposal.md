---
Date: 2026-06-27
Change: workflow-to-client-mgmt
Requirements: requirements.md
---

## Why

The admin "Workflow" nav item is a separate section that duplicates information already accessible via the per-client workflow tab, forcing admins to context-switch between two places. Surfacing each client's active engagement status directly in the client list removes that split and gives admins a single starting point for all client and workflow work.

## What Changes

- Remove the "Workflow" navigation link from the admin navbar.
- Add `activeEngagementStatus` (nullable) to `ClientDto` — computed server-side as the latest non-COMPLETED engagement; falls back to COMPLETED if all are completed; null if no engagements.
- Add a "Workflow State" column to the client list table showing each client's `activeEngagementStatus` (or "—" when null).
- Add a "Workflow State" dropdown filter to the client list (options: All, START, IN_PROCESSING, PENDING_CLIENT_REVIEW, SUBMIT_TO_CRA, COMPLETED, — None —).
- Add a "Workflow" action button per client row that navigates to `/admin/clients/:id/workflow`.
- The `/admin/workflow` route and `AdminWorkflowComponent` are retained but unlinked from the navbar (no deletion; cleanup deferred).

## Capabilities

### New Capabilities

_(none)_

### Modified Capabilities

- **admin-workflow-ui** — The "Workflow link visible to admins" requirement is removed (the link is deleted from the navbar). The per-client workflow tab and all engagement creation/transition/history requirements are unchanged.
- **client-management** — `ClientDto` gains an `activeEngagementStatus` field. The client list gains a Workflow State column, a Workflow State filter, and a per-row Workflow action button.

## Impact

- `backend/`: `ClientDto.java` (new field), `ClientService.java` (query enrichment)
- `frontend/src/app/shared/navbar/navbar.component.html` (remove Workflow link)
- `frontend/src/app/features/admin/clients/admin-clients.component.ts` + `.html` + `.css` (new column, filter, action)
- `frontend/src/app/core/models/client.model.ts` (new field on `ClientDto`)
- `frontend/src/app/core/services/admin-clients.service.ts` (no change needed — field comes through existing `GET /api/clients`)
- Tests: `ClientControllerTest.java`, `ClientServiceTest.java`, `admin-clients.component.spec.ts`

## Out of Scope

- Removing the `/admin/workflow` route and `AdminWorkflowComponent` — deferred to a future cleanup change.
- Changes to the per-client workflow page (`/admin/clients/:id/workflow`).
- Changes to engagement creation, transition, or history logic.
- Server-side filtering of clients by workflow state.
