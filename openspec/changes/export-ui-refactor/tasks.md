## 1. Template, CSS, and unit test changes

### Contract
- **Spec**: "The admin client list page SHALL display an Export button in the page header at all times. The Export button SHALL be disabled when no clients are selected and SHALL become enabled when at least one client is selected." / "A 'Select all' control SHALL be rendered inside the `<th>` of the checkbox column (left-aligned, above the checkboxes)." / "The export toolbar SHALL NOT contain an Export button."
- **Runtime**: `cd frontend && npx ng test --no-watch --include='**/admin-clients.component.spec.ts'` → expected: all existing tests pass plus new disabled/enabled and always-present tests pass
- **Code**: page-header becomes flex row (justify-content: space-between); export button uses `[disabled]="selectedClientIds().size === 0"` binding with `.header-export-btn:disabled` CSS; select-all-btn cut from `.toolbar-actions` and pasted into `<th class="select-col">`; `th.select-col` needs `min-width: 110px; padding: 6px 10px` to fit the button; export-action-btn block removed from export-toolbar HTML; isExporting spinner moves to header button
- **Threshold**: 80

- [ ] 1.0 CONTRACT — write openspec/changes/export-ui-refactor/contracts/group-1.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [ ] 1.1 RED — in `admin-clients.component.spec.ts`, add test: "export-btn is present in DOM with no selection (always-visible header button)" — `querySelector('[data-testid="export-btn"]')` not null when no client is selected; run and confirm it fails (button currently absent when no selection)
- [ ] 1.2 RED — add test: "export-btn is disabled when 0 clients selected and enabled after selecting 1" — assert `exportBtn.disabled === true` initially, then `toggleSelection`, detectChanges, assert `exportBtn.disabled === false`; run and confirm it fails
- [ ] 1.3 GREEN — update `admin-clients.component.html`: add `<button class="header-export-btn" data-testid="export-btn" [disabled]="selectedClientIds().size === 0 || isExporting()" (click)="openExportDialog()">` with isExporting spinner inside to `.page-header`; remove the `<button class="export-action-btn">` block from `.export-toolbar`; move `<button class="select-all-btn">` from `.toolbar-actions` into `<th class="select-col">`; run 1.1 and 1.2 tests and confirm they pass
- [ ] 1.4 GREEN — update `admin-clients.component.css`: add `display: flex; justify-content: space-between; align-items: flex-start` to `.page-header`; add `.header-export-btn` styles (match export-action-btn style from toolbar); add `.header-export-btn:disabled` with `opacity: 0.4; cursor: not-allowed`; update `.clients-table th.select-col` to `min-width: 110px; padding: 6px 10px`; delete unused `.export-action-btn` styles if no other references
- [ ] 1.5 Update existing unit test "export toolbar has an Export button" (line 376): rename to "export-btn is enabled and present when a client is selected" — verify export-btn is not disabled after a toggle, confirm test passes
- [ ] 1.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-1.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 2. E2E update and verification

### Contract
- **Spec**: "The Export button SHALL be disabled when no clients are selected and SHALL become enabled when at least one client is selected." / "The export toolbar SHALL NOT contain an Export button (the Export button is in the page header)."
- **Runtime**: `cd e2e && npx playwright test admin-client-export` → expected: all 5 export e2e tests pass including updated assertion on test "selecting a client shows export toolbar"
- **Code**: e2e test at `admin-client-export.spec.ts:45` checks `export-btn` visible after selection — trivially true after refactor; replace with: assert `export-btn` disabled before selection and enabled after selection
- **Threshold**: 80

- [ ] 2.0 CONTRACT — write openspec/changes/export-ui-refactor/contracts/group-2.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [ ] 2.1 RED — update `e2e/admin-client-export.spec.ts` test "selecting a client shows export toolbar": before clicking the checkbox, assert `await expect(page.getByTestId('export-btn')).toBeDisabled()`; after clicking, assert `await expect(page.getByTestId('export-btn')).toBeEnabled()`; remove the now-trivial `toBeVisible()` assertion; run e2e and confirm the `toBeDisabled()` assertion fails (button not yet disabled in current code — it doesn't exist in header yet; this RED is validated by first completing group 1)
- [ ] 2.2 Run `cd frontend && npx ng test --no-watch` — all frontend unit tests pass
- [ ] 2.3 Run `cd e2e && npx playwright test admin-client-export` — all 5 export tests pass
- [ ] 2.4 Run /security-review on the branch diff; address Critical/High/Medium findings before proceeding
- [ ] 2.5 Run superpowers:verification-before-completion
- [ ] 2.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-2.md + spec + design + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)
