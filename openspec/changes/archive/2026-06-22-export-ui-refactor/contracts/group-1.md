### Contract

- **Spec**: "The admin client list page SHALL display an Export button in the page header at all times. The Export button SHALL be disabled when no clients are selected and SHALL become enabled when at least one client is selected." / "A 'Select all' control SHALL be rendered inside the `<th>` of the checkbox column (left-aligned, above the checkboxes)." / "The export toolbar SHALL NOT contain an Export button."
- **Runtime**: `cd frontend && npx ng test --no-watch --include='**/admin-clients.component.spec.ts'` → expected: all existing tests pass plus new disabled/enabled and always-present tests pass
- **Code**: page-header becomes flex row (justify-content: space-between); export button uses `[disabled]="selectedClientIds().size === 0"` binding with `.header-export-btn:disabled` CSS; select-all-btn cut from `.toolbar-actions` and pasted into `<th class="select-col">`; `th.select-col` needs `min-width: 110px; padding: 6px 10px` to fit the button; export-action-btn block removed from export-toolbar HTML; isExporting spinner moves to header button
- **Threshold**: 80
