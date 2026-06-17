### Contract

- **Spec**:
  - The admin client list UI SHALL display a checkbox column allowing selection of individual clients.
  - A "Select all" control SHALL select all clients matching the current name/email filter across all pages by fetching all client IDs matching the filter via a lightweight request.
  - When the name or email filter changes, the current selection SHALL be cleared.
  - When ≥1 client is selected, the admin client list SHALL display an export toolbar showing the count of selected clients and an "Export" button.
  - The export dialog SHALL present: checkboxes for "Include client metadata" and "Include documents" (both checked by default), a year selector (visible only when "Include documents" is checked, defaulting to "All years"), and "Cancel" / "Export" actions.
  - The Export button SHALL be disabled and show a loading indicator while the request is in flight.
  - On success, the browser SHALL download the file with the server-provided filename.
  - On 400 or 403 from the server, the frontend SHALL display the error message in a snackbar.
  - When the selection reaches 200, attempting to add a 201st client SHALL show an inline message "Export limited to 200 clients at a time" and not add the client.
  - The export toolbar SHALL include a "Clear" button (`data-testid="deselect-all-btn"`) that deselects all clients and dismisses any cap message.

- **Runtime**: `cd frontend && npx ng test --no-watch --include='**/admin-clients/**,**/admin-export*'` → all tests pass including new multi-select and export dialog specs

- **Code**:
  - D4: "Select all" calls `GET /api/clients/ids?name=&email=` (new lightweight endpoint) — one round-trip, merges IDs into selection signal
  - D6: Export uses `HttpClient` with `responseType: 'blob'`, creates `URL.createObjectURL`, programmatically clicks `<a>` — do NOT use `window.location.href` (can't POST with it)
  - D7: Selection cleared automatically when filter changes — Angular effect watching filter signals

- **Threshold**: 80
