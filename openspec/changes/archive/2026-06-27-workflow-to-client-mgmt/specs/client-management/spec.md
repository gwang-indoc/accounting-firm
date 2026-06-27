## MODIFIED Requirements

### Requirement: List all clients
The system SHALL allow an authenticated admin to retrieve only the clients they own (where `admin_id` matches the authenticated admin's ID). Each client in the response SHALL include `activeEngagementStatus` — the status of the most recent non-COMPLETED engagement by tax year for that client; if all engagements are COMPLETED the field is COMPLETED; if the client has no engagements the field is null.

#### Scenario: Successful list
- **WHEN** an authenticated admin sends `GET /api/clients`
- **THEN** the system returns `200 OK` with a JSON array of clients owned by that admin only, and each client includes `activeEngagementStatus`

#### Scenario: activeEngagementStatus reflects latest active engagement
- **WHEN** a client has engagements in multiple statuses including at least one non-COMPLETED
- **THEN** the returned `activeEngagementStatus` is the status of the most recent non-COMPLETED engagement by tax year

#### Scenario: activeEngagementStatus is null for client with no engagements
- **WHEN** a client has no engagements
- **THEN** the returned `activeEngagementStatus` is null

#### Scenario: activeEngagementStatus falls back to COMPLETED when all engagements are done
- **WHEN** a client's engagements are all at status COMPLETED
- **THEN** the returned `activeEngagementStatus` is COMPLETED

## ADDED Requirements

### Requirement: Workflow state column in client list
The system SHALL display an `activeEngagementStatus` column in the admin client list table. The column SHALL render the status string for clients with engagements, and "—" for clients with null `activeEngagementStatus`.

#### Scenario: Workflow state shown for client with active engagement
- **WHEN** an admin views the client list and a client has an active engagement
- **THEN** the client's row shows the active engagement status in the Workflow State column

#### Scenario: Workflow state shown as dash for client with no engagements
- **WHEN** an admin views the client list and a client has no engagements
- **THEN** the client's row shows "—" in the Workflow State column

### Requirement: Workflow state filter in client list
The system SHALL provide a "Workflow State" dropdown filter above the client list table. The filter SHALL offer options: All, START, IN_PROCESSING, PENDING_CLIENT_REVIEW, SUBMIT_TO_CRA, COMPLETED, and "— None —" (clients with no engagements). Filtering is applied client-side to the already-loaded client list and resets the pagination to page 1.

#### Scenario: Filter by specific status
- **WHEN** an admin selects a status from the Workflow State filter
- **THEN** only clients whose `activeEngagementStatus` matches that status are shown

#### Scenario: Filter by None shows clients with no engagements
- **WHEN** an admin selects "— None —" from the Workflow State filter
- **THEN** only clients whose `activeEngagementStatus` is null are shown

#### Scenario: Filter All shows every client
- **WHEN** an admin selects "All" from the Workflow State filter
- **THEN** all clients are shown regardless of their `activeEngagementStatus`

#### Scenario: Workflow state filter resets pagination
- **WHEN** an admin changes the Workflow State filter selection
- **THEN** the client list resets to page 1

### Requirement: Workflow action per client row
The system SHALL display a "Workflow" action button in each client row of the admin client list. Clicking the button SHALL navigate the admin to `/admin/clients/:id/workflow` for that client.

#### Scenario: Workflow button navigates to per-client workflow page
- **WHEN** an admin clicks the "Workflow" button on a client row
- **THEN** the browser navigates to `/admin/clients/{id}/workflow` for that client
