# admin-workflow-ui Specification

## Purpose
Provides the admin-facing surfaces for managing client engagement workflows. Includes a `/admin/workflow` dashboard showing all engagements across all clients with status and business-type filters, and a per-client Workflow tab where admins can create engagements, change status with an optional note, and review the full transition history.
## Requirements
### Requirement: Admin workflow dashboard page
The system SHALL provide a `/admin/workflow` page accessible only to authenticated admins. The page SHALL display a table of all client engagements across all tax years. Table columns: Client Name, Business Type, Tax Year, Status, Last Updated, Last Updated By. The table SHALL support filtering by Status and by Business Type. The page SHALL NOT be linked in the admin navbar.

#### Scenario: Workflow dashboard loads all engagements
- **WHEN** an authenticated admin navigates to `/admin/workflow`
- **THEN** the page displays a table with one row per engagement across all clients and all tax years, showing Client Name, Business Type, Tax Year, Status, Last Updated, and Last Updated By

#### Scenario: Filter by status
- **WHEN** an admin selects a status filter on the workflow dashboard
- **THEN** the table shows only engagements matching that status

#### Scenario: Filter by business type
- **WHEN** an admin selects a business type filter on the workflow dashboard
- **THEN** the table shows only engagements for clients of that business type

#### Scenario: Non-admin cannot access workflow dashboard
- **WHEN** a non-admin authenticated user navigates to `/admin/workflow`
- **THEN** the admin guard redirects them away from the page

#### Scenario: Workflow nav link absent for admins
- **WHEN** an authenticated admin views any page in the admin portal
- **THEN** the navbar does NOT include a "Workflow" navigation link

### Requirement: Client detail — Workflow tab
The system SHALL add a "Workflow" tab to the admin client detail view. The tab SHALL list all engagements for the client ordered by tax year descending. Each engagement row shows the tax year and current status. Each engagement SHALL be expandable to reveal its full transition history (from status, to status, changed by, changed at, note).

#### Scenario: Workflow tab appears on client detail
- **WHEN** an authenticated admin opens a client's detail view
- **THEN** a "Workflow" tab is visible alongside any existing tabs

#### Scenario: Workflow tab lists all engagements
- **WHEN** an admin clicks the Workflow tab for a client with engagements
- **THEN** each engagement appears as a row showing tax year and current status, ordered newest first

#### Scenario: Workflow tab is empty for new clients
- **WHEN** an admin clicks the Workflow tab for a client with no engagements
- **THEN** the tab shows an empty state with a prompt to create the first engagement

#### Scenario: Expand engagement to see history
- **WHEN** an admin expands an engagement row
- **THEN** the full transition history is displayed: each entry shows from status, to status, who changed it, when, and any note

---

### Requirement: Create engagement from Workflow tab
The system SHALL allow an admin to open a new engagement from the client's Workflow tab by entering a tax year. The engagement is created at status START.

#### Scenario: New engagement created via UI
- **WHEN** an admin clicks "New Engagement", enters a valid tax year, and confirms
- **THEN** the new engagement appears in the list at status START

#### Scenario: Duplicate tax year rejected in UI
- **WHEN** an admin attempts to create an engagement for a tax year that already exists for that client
- **THEN** the UI displays an error message and does not create a duplicate

---

### Requirement: Transition status from Workflow tab
The system SHALL allow an admin to change the status of any engagement from the Workflow tab. The admin SHALL be able to optionally add a note before confirming the transition.

#### Scenario: Status changed via dropdown
- **WHEN** an admin selects a new status from the status control on an engagement row and confirms
- **THEN** the engagement's status updates in the UI and the new history entry appears when the row is expanded

#### Scenario: Note added on transition
- **WHEN** an admin enters an optional note before confirming a status transition
- **THEN** the note is saved and visible in the history for that transition

---

### Requirement: Client create/edit includes business type and fiscal year end
The admin client creation and edit dialog SHALL include fields for business type (required, select: Personal / Corporate / Self-Employed) and fiscal year end month and day (required for Corporate and Self-Employed, read-only Dec 31 for Personal).

#### Scenario: Business type selector shown in dialog
- **WHEN** an admin opens the create or edit client dialog
- **THEN** a "Business Type" select field is present with options Personal, Corporate, Self-Employed

#### Scenario: Fiscal year end fields shown for non-personal
- **WHEN** an admin selects Corporate or Self-Employed as the business type
- **THEN** month and day fields for fiscal year end become visible and required

#### Scenario: Fiscal year end fixed for Personal
- **WHEN** an admin selects Personal as the business type
- **THEN** the fiscal year end fields show Dec 31 and are read-only (or hidden)

#### Scenario: Business type displayed in client list
- **WHEN** an admin views the client list at `/admin/clients`
- **THEN** each client row shows the business type

