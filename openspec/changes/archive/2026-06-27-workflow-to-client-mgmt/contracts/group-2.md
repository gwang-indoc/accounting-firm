# Contract — Group 2: Frontend client list enhancements + navbar

## Spec

From `specs/client-management/spec.md`:

- **Workflow state column**: "The system SHALL display an `activeEngagementStatus` column in the admin client list table. The column SHALL render the status string for clients with engagements, and '—' for clients with null `activeEngagementStatus`."
- **Workflow state filter**: "The system SHALL provide a 'Workflow State' dropdown filter above the client list table. The filter SHALL offer options: All, START, IN_PROCESSING, PENDING_CLIENT_REVIEW, SUBMIT_TO_CRA, COMPLETED, and '— None —' (clients with no engagements). Filtering is applied client-side and resets pagination to page 1."
- **Workflow action button**: "The system SHALL display a 'Workflow' action button in each client row. Clicking the button SHALL navigate the admin to `/admin/clients/:id/workflow` for that client."

From `specs/admin-workflow-ui/spec.md`:

- **Workflow nav link absent**: Scenario — WHEN an authenticated admin views any page in the admin portal, THEN the navbar does NOT include a "Workflow" navigation link.

Scenarios covered:
1. Workflow State column renders status string for client with `activeEngagementStatus`
2. Workflow State column renders "—" for client with null `activeEngagementStatus`
3. Filtering by a specific status shows only matching clients
4. Filtering by `'__none__'` sentinel shows only null-status clients
5. Filtering by `''` (All) shows all clients; pagination resets to page 1 on filter change
6. Clicking Workflow button calls `router.navigate` with `['/admin/clients', id, 'workflow']`
7. Admin navbar does NOT render the "Workflow" navigation link

## Runtime

```
cd frontend && npx ng test --no-watch
```

Expected: new tests for Workflow State column rendering, filter scenarios (status, None, All), pagination reset, Workflow button navigation, and navbar Workflow link absence all pass; all pre-existing client list and navbar tests unaffected.

## Code

- D3 — add `workflowStateFilter = signal<string>('')` to `AdminClientsComponent`; extend `filteredClients` computed to include workflow state filter logic; use `'__none__'` sentinel string for "— None —" (clients with null `activeEngagementStatus`), `''` for All
- D4 — add `openWorkflow(client: ClientDto)` using `this.router.navigate(['/admin/clients', client.id, 'workflow'])` — no `routerLink` directive (consistent with `openDocuments`/`openMessages`)
- Add `activeEngagementStatus: EngagementStatus | null` to the Angular `ClientDto` interface

## Threshold

80
