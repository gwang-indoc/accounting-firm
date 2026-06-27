### Contract

- **Spec**: (admin-workflow-ui) "The system SHALL provide a `/admin/workflow` page accessible only to authenticated admins displaying a table of all client engagements across all tax years." | "Table columns: Client Name, Business Type, Tax Year, Status, Last Updated, Last Updated By." | "The table SHALL support filtering by Status and by Business Type." | "The page SHALL be linked in the admin sidebar navigation." | "Client create/edit dialog SHALL include business type and fiscal year end fields."
- **Runtime**: `cd frontend && npx ng test --no-watch` → AdminWorkflowComponent unit tests pass; filter-by-status and filter-by-business-type tests pass; client dialog businessType/FYE field tests pass
- **Code**: standalone zoneless Angular component; Angular Material table (`mat-table`) with `mat-select` filters; lazy-loaded route under `/admin/workflow` protected by `adminGuard`; `EngagementService` wraps `GET /api/admin/engagements`; business type select + conditional FYE fields in `AdminClientDialogComponent` (hide FYE for PERSONAL, show + require for CORPORATE/SELF_EMPLOYED)
- **Threshold**: 80
