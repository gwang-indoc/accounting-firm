### Contract

- **Spec**: "The Export button SHALL be disabled when no clients are selected and SHALL become enabled when at least one client is selected." / "The export toolbar SHALL NOT contain an Export button (the Export button is in the page header)."
- **Runtime**: `cd e2e && npx playwright test admin-client-export` → expected: all 5 export e2e tests pass including updated assertion on test "selecting a client shows export toolbar"
- **Code**: e2e test at `admin-client-export.spec.ts:45` checks `export-btn` visible after selection — trivially true after refactor; replace with: assert `export-btn` disabled before selection and enabled after selection
- **Threshold**: 80
