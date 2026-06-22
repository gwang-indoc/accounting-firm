## MODIFIED Requirements

### Requirement: Admin client list supports multi-select
The admin client list UI SHALL display a checkbox column allowing selection of individual clients. A "Select all" control SHALL be rendered inside the `<th>` of the checkbox column (left-aligned, above the checkboxes) and SHALL select all clients matching the current name/email filter across all pages (not just the visible page). Deselecting a client or clearing the filter SHALL update the selection accordingly.

#### Scenario: Individual checkbox selection
- **WHEN** an admin checks the checkbox for a client row
- **THEN** that client is added to the active selection

#### Scenario: Select all filtered
- **WHEN** an admin activates "Select all"
- **THEN** the frontend fetches all client IDs matching the current filter (a lightweight ID-only request) and adds them all to the selection

#### Scenario: Selection cleared on filter change
- **WHEN** the admin changes the name or email filter after making a selection
- **THEN** the current selection is cleared

#### Scenario: Select all control is in the checkbox column header
- **WHEN** the admin views the client list
- **THEN** the "Select all" button is rendered inside the `<th>` of the checkbox column, left-aligned above the individual row checkboxes

---

### Requirement: Export button is always visible in the page header
The admin client list page SHALL display an Export button in the page header at all times. The Export button SHALL be disabled when no clients are selected and SHALL become enabled when at least one client is selected. Clicking the enabled Export button SHALL open the export configuration dialog.

#### Scenario: Export button visible with no selection
- **WHEN** an admin views the client list with no clients selected
- **THEN** the Export button is visible in the page header but is disabled

#### Scenario: Export button enabled after selection
- **WHEN** an admin selects at least one client
- **THEN** the Export button in the page header becomes enabled

#### Scenario: Export button opens dialog when clicked
- **WHEN** an admin clicks the enabled Export button in the page header
- **THEN** the export configuration dialog opens

---

### Requirement: Export toolbar shows selection count and clear only
When ≥1 client is selected, the admin client list SHALL display an export toolbar showing the count of selected clients, a label, and a "Clear" button. The export toolbar SHALL NOT contain an Export button (the Export button is in the page header). The toolbar disappears when no clients are selected.

#### Scenario: Export toolbar appears on selection
- **WHEN** an admin selects at least one client
- **THEN** the export toolbar becomes visible showing "X clients selected" and a "Clear" button, with no Export button inside it

#### Scenario: Export toolbar hidden with no selection
- **WHEN** no clients are selected
- **THEN** the export toolbar is not visible

#### Scenario: Selection capped at 200 in UI
- **WHEN** the active selection reaches 200 clients
- **THEN** attempting to select a 201st client shows an inline message "Export limited to 200 clients at a time" and the 201st is not added

#### Scenario: Clear selection button deselects all clients
- **WHEN** the admin clicks the "Clear" button in the export toolbar
- **THEN** all selected clients are deselected, the export toolbar is hidden, and any cap message is dismissed
