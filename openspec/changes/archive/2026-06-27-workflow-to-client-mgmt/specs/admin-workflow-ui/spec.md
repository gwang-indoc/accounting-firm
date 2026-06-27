## MODIFIED Requirements

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
