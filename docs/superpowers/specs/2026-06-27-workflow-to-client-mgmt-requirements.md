---
Date: 2026-06-27
Change: workflow-to-client-mgmt
Status: REVIEWED
---

## Goals

- Remove "Workflow" as a standalone nav item; workflow is now accessed from within Client Management.
- Surface each client's active engagement state directly in the client list — admins can see workflow progress without navigating away.
- Add a per-client "Workflow" action that deep-links to the existing per-client workflow page (`/admin/clients/:id/workflow`).
- Add a workflow-state filter to the client list so admins can quickly find all clients at a given stage.

## Non-Goals

- No changes to the per-client workflow page (`/admin/clients/:id/workflow`) itself.
- No changes to how engagements are created, transitioned, or historised.
- The global engagement dashboard route (`/admin/workflow`) is removed from the navbar but its route and component are not deleted (left as unlisted, can be cleaned up later).
- No pagination or server-side filtering changes — the workflow-state filter is applied client-side, consistent with existing name/email filters.

## Constraints

- "Active engagement status" = the most recent non-COMPLETED engagement by tax year. If all engagements are COMPLETED, show COMPLETED. If the client has no engagements, show `null` (rendered as "—").
- Backend must compute `activeEngagementStatus` server-side (one JOIN) rather than requiring a second frontend API call.
- `ClientDto` record must stay backward-compatible — the new field is nullable so existing callers are unaffected.
- Frontend filter and column must use the same `EngagementStatus` type already defined in `engagement.model.ts`.
- No new route is introduced; the "Workflow" action button navigates to the already-existing `/admin/clients/:id/workflow`.

## Success Criteria

- [ ] "Workflow" link is absent from the admin navbar.
- [ ] Client list table has a "Workflow State" column showing the active engagement status (or "—") for each client.
- [ ] A "Workflow State" dropdown filter above the table lets admins filter to a specific status, "— None —" (no engagements), or "All".
- [ ] Selecting "All" shows all clients regardless of workflow state; selecting "— None —" shows only clients with no engagements.
- [ ] Each client row has a "Workflow" action button that navigates to `/admin/clients/:id/workflow`.
- [ ] `GET /api/clients` response includes `activeEngagementStatus` (nullable) on each `ClientDto`.
- [ ] All existing backend tests pass; new tests cover the `activeEngagementStatus` field for: no engagements, one active, one COMPLETED, mixed.
- [ ] All existing frontend tests pass; new tests cover the new column, filter behaviour, and workflow button navigation.

## User Stories

**US-1: Admin sees workflow state at a glance**
As an admin, when I open the client list I can see each client's current workflow state in the table, so I know immediately which clients are in processing, pending review, etc. without opening each one.

**US-2: Admin filters by workflow state**
As an admin, I can select a workflow state from a dropdown at the top of the client list to see only clients at that stage (e.g., all clients "PENDING_CLIENT_REVIEW"), or select "— None —" to find clients with no engagements started yet, so I can batch-manage clients efficiently.

**US-3: Admin jumps directly to a client's workflow**
As an admin, I can click a "Workflow" action button on any client row to navigate directly to that client's engagement workflow page, so I don't have to remember the URL or go through an intermediate page.

**US-4: Workflow is no longer a separate nav section**
As an admin, I no longer see a "Workflow" item in the top navbar. All workflow activity is discoverable through the client list, keeping the navigation model simple.

## Open Questions

- None remaining.

## Referenced Capabilities

- Existing: `GET /api/clients` (`ClientController.list`), `ClientService.findAll`, `ClientDto`
- Existing: `EngagementStatus` type in `engagement.model.ts`
- Existing: `/admin/clients/:id/workflow` route and `AdminClientWorkflowComponent`
- Existing: `AdminWorkflowComponent` at `/admin/workflow` (to be removed from navbar only)
- Affected: `navbar.component.html` (remove Workflow link)
- Affected: `admin-clients.component.ts` / `.html` / `.css` (new column, filter, action)
- Affected: `ClientDto.java` (add `activeEngagementStatus`)
- Affected: `ClientService.java` (compute active status in `findAll`)
