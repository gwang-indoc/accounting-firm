## MODIFIED Requirements

### Requirement: Client detail — Workflow tab
The system SHALL add a "Workflow" tab to the admin client detail view. The tab SHALL list all engagements for the client ordered by tax year descending. Each engagement row shows the engagement name, tax year, and current status. Each engagement SHALL be expandable to reveal its full transition history (from status, to status, changed by, changed at, note) and the current engagement-level note.

#### Scenario: Workflow tab appears on client detail
- **WHEN** an authenticated admin opens a client's detail view
- **THEN** a "Workflow" tab is visible alongside any existing tabs

#### Scenario: Workflow tab lists all engagements with name
- **WHEN** an admin clicks the Workflow tab for a client with engagements
- **THEN** each engagement appears as a row showing engagement name, tax year, and current status, ordered newest first

#### Scenario: Workflow tab is empty for new clients
- **WHEN** an admin clicks the Workflow tab for a client with no engagements
- **THEN** the tab shows an empty state with a prompt to create the first engagement

#### Scenario: Expand engagement to see history and note
- **WHEN** an admin expands an engagement row
- **THEN** the current engagement-level note is displayed, and the full transition history is shown: each entry shows from status, to status, who changed it, when, and any note

---

### Requirement: Create engagement from Workflow tab
The system SHALL allow an admin to open a new engagement from the client's Workflow tab by entering a tax year and a mandatory name. The engagement is created at status START.

#### Scenario: New engagement created via UI
- **WHEN** an admin clicks "New Engagement", enters a valid tax year and a non-blank name, and confirms
- **THEN** the new engagement appears in the list at status START with the entered name

#### Scenario: Submit disabled until name is provided
- **WHEN** an admin opens the New Engagement dialog and has not entered a name
- **THEN** the confirm button is disabled

#### Scenario: Duplicate name for same client and year rejected in UI
- **WHEN** an admin attempts to create an engagement with the same name as an existing engagement for that client and tax year
- **THEN** the UI displays an error message and does not create a duplicate

---

### Requirement: Transition status from Workflow tab
The system SHALL allow an admin to change the status of any engagement from the Workflow tab. The Change Status dialog SHALL display the current engagement-level note pre-filled in an editable textarea (labelled "Engagement Notes"). Saving the transition replaces the engagement's note with the new value and records the history entry.

#### Scenario: Status changed via Change Status dialog
- **WHEN** an admin selects a new status from the status control on an engagement row and confirms
- **THEN** the engagement's status updates in the UI and the new history entry appears when the row is expanded

#### Scenario: Engagement note pre-filled in Change Status dialog
- **WHEN** an admin opens the Change Status dialog for an engagement that has an existing note
- **THEN** the "Engagement Notes" textarea is pre-filled with the current note text

#### Scenario: Engagement note updated on transition
- **WHEN** an admin edits the note in the Change Status dialog and confirms
- **THEN** the updated note is saved to the engagement and visible when the engagement row is expanded

#### Scenario: Engagement note cleared on transition
- **WHEN** an admin clears the note field in the Change Status dialog and confirms
- **THEN** the engagement's note is set to null
