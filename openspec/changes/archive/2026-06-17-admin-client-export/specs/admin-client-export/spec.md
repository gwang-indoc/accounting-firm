## ADDED Requirements

### Requirement: Export endpoint accepts client IDs and export options
The system SHALL expose `POST /api/clients/export` accepting a JSON body with: `clientIds` (array of longs, required, 1–200 items), `includeMetadata` (boolean), `includeDocuments` (boolean), and `year` (integer or null — null means all years). At least one of `includeMetadata` or `includeDocuments` SHALL be true. The authenticated admin SHALL only be permitted to export clients they own.

#### Scenario: Missing clientIds
- **WHEN** an authenticated admin posts to `/api/clients/export` without a `clientIds` field
- **THEN** the system returns `400 Bad Request`

#### Scenario: Empty clientIds
- **WHEN** an authenticated admin posts to `/api/clients/export` with an empty `clientIds` array
- **THEN** the system returns `400 Bad Request`

#### Scenario: clientIds exceeds cap
- **WHEN** an authenticated admin posts to `/api/clients/export` with more than 200 client IDs
- **THEN** the system returns `400 Bad Request` with message "Export limited to 200 clients at a time"

#### Scenario: Neither includeMetadata nor includeDocuments
- **WHEN** an authenticated admin posts with both `includeMetadata: false` and `includeDocuments: false`
- **THEN** the system returns `400 Bad Request`

#### Scenario: Client ID not owned by admin
- **WHEN** an authenticated admin posts with a `clientIds` entry that belongs to a different admin
- **THEN** the system returns `403 Forbidden`

---

### Requirement: Metadata-only export returns a CSV file
When `includeMetadata` is true and `includeDocuments` is false, the system SHALL return `200 OK` with `Content-Type: text/csv`, `Content-Disposition: attachment; filename="clients-export-{YYYY-MM-DD}.csv"`, and CSV body containing one header row and one data row per requested client. CSV columns SHALL be: Name, Email, Phone, Created Date, Linked Portal User Email.

#### Scenario: Successful metadata-only export
- **WHEN** an authenticated admin posts with valid `clientIds`, `includeMetadata: true`, `includeDocuments: false`
- **THEN** the system returns `200 OK` with Content-Type `text/csv` and a CSV body with one row per client

#### Scenario: Linked portal user email in CSV
- **WHEN** a client has a linked portal user (non-null `user_id`)
- **THEN** the CSV row for that client includes the linked user's email in the "Linked Portal User Email" column

#### Scenario: Unlinked client in CSV
- **WHEN** a client has no linked portal user (`user_id` is null)
- **THEN** the CSV row for that client has an empty string in the "Linked Portal User Email" column

---

### Requirement: Documents-only export returns a ZIP file
When `includeDocuments` is true and `includeMetadata` is false, the system SHALL return `200 OK` with `Content-Type: application/zip`, `Content-Disposition: attachment; filename="documents-export-{YYYY-MM-DD}.zip"`, and a ZIP body. ZIP entries SHALL follow the path pattern `{ClientName}-{clientId}/{year}/{filename}`. Clients with no documents for the requested year (or no documents at all when year is null) SHALL be silently omitted from the ZIP. If no documents are found for any selected client, the system SHALL return `400 Bad Request` with message "No documents found for the selected clients and year."

#### Scenario: Successful documents-only export for a specific year
- **WHEN** an authenticated admin posts with valid `clientIds`, `includeDocuments: true`, `includeMetadata: false`, and a specific `year`
- **THEN** the system returns `200 OK` with a ZIP whose entries are `{ClientName}-{clientId}/{year}/{filename}` for all documents matching that year

#### Scenario: Successful documents-only export for all years
- **WHEN** an authenticated admin posts with `includeDocuments: true`, `includeMetadata: false`, and `year: null`
- **THEN** the system returns `200 OK` with a ZIP whose entries cover documents from all years, structured as `{ClientName}-{clientId}/{year}/{filename}`

#### Scenario: Client with no documents silently omitted
- **WHEN** a selected client has no documents for the requested year
- **THEN** that client does not appear in the ZIP (no empty folder), and the ZIP still contains entries for other clients that do have documents

#### Scenario: No documents found across all selected clients
- **WHEN** none of the selected clients have documents for the requested year
- **THEN** the system returns `400 Bad Request` with message "No documents found for the selected clients and year."

---

### Requirement: Combined export returns a ZIP with CSV plus documents
When both `includeMetadata` and `includeDocuments` are true, the system SHALL return a ZIP named `export-{YYYY-MM-DD}.zip` containing `clients.csv` at the ZIP root (same format as the metadata-only CSV) and all document entries at `{ClientName}-{clientId}/{year}/{filename}`.

#### Scenario: Successful combined export
- **WHEN** an authenticated admin posts with `includeMetadata: true`, `includeDocuments: true`, and valid `clientIds`
- **THEN** the system returns `200 OK` with a ZIP containing `clients.csv` at the root and document entries under `{ClientName}-{clientId}/{year}/`

#### Scenario: Combined export with some clients having no documents
- **WHEN** some selected clients have documents and others do not
- **THEN** `clients.csv` includes all selected clients, but only clients with documents appear in the folder structure

---

### Requirement: Export is streamed — not buffered in memory
The system SHALL stream ZIP content directly to the HTTP response using `ZipOutputStream` without accumulating the entire ZIP body in memory first.

#### Scenario: Large export does not OOM
- **WHEN** an admin exports 200 clients with many documents
- **THEN** the system writes each ZIP entry to the response output stream as it reads from disk, without loading all file bytes into a single in-memory buffer

---

### Requirement: Admin client list supports multi-select
The admin client list UI SHALL display a checkbox column allowing selection of individual clients. A "Select all" control SHALL select all clients matching the current name/email filter across all pages (not just the visible page). Deselecting a client or clearing the filter SHALL update the selection accordingly.

#### Scenario: Individual checkbox selection
- **WHEN** an admin checks the checkbox for a client row
- **THEN** that client is added to the active selection

#### Scenario: Select all filtered
- **WHEN** an admin activates "Select all"
- **THEN** the frontend fetches all client IDs matching the current filter (a lightweight ID-only request) and adds them all to the selection

#### Scenario: Selection cleared on filter change
- **WHEN** the admin changes the name or email filter after making a selection
- **THEN** the current selection is cleared

---

### Requirement: Export toolbar and dialog appear when clients are selected
When ≥1 client is selected, the admin client list SHALL display an export toolbar showing the count of selected clients and an "Export" button. Clicking "Export" SHALL open a dialog with: checkboxes for "Include client metadata" and "Include documents" (both checked by default), a year selector (visible only when "Include documents" is checked, defaulting to "All years"), and "Cancel" / "Export" actions.

#### Scenario: Export toolbar appears on selection
- **WHEN** an admin selects at least one client
- **THEN** the export toolbar becomes visible showing "X clients selected" and an "Export" button

#### Scenario: Export toolbar hidden with no selection
- **WHEN** no clients are selected
- **THEN** the export toolbar is not visible

#### Scenario: Year selector hidden for metadata-only
- **WHEN** the admin unchecks "Include documents" in the export dialog
- **THEN** the year selector is hidden

#### Scenario: Selection capped at 200 in UI
- **WHEN** the active selection reaches 200 clients
- **THEN** the "Export" button remains enabled but attempting to select a 201st client shows an inline message "Export limited to 200 clients at a time" and the 201st is not added

#### Scenario: Clear selection button deselects all clients
- **WHEN** the admin clicks the "Clear" button in the export toolbar
- **THEN** all selected clients are deselected, the export toolbar is hidden, and any cap message is dismissed

---

### Requirement: Export triggers a file download in the browser
Confirming the export dialog SHALL POST to `/api/clients/export` with `withCredentials: true` and trigger a browser file download for the response (CSV or ZIP). A loading indicator SHALL be shown on the Export button while the request is in flight.

#### Scenario: Successful export triggers download
- **WHEN** the admin confirms the export dialog
- **THEN** the frontend posts to `/api/clients/export`, receives the file response, and the browser downloads the file with the server-provided filename

#### Scenario: Loading state during export
- **WHEN** the export request is in flight
- **THEN** the Export button shows a loading indicator and is disabled to prevent duplicate submissions

#### Scenario: Server error surfaces as snackbar
- **WHEN** the server returns a 400 or 403 during export
- **THEN** the frontend closes the loading state and displays the error message in a snackbar
