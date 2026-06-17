# Eval Log — admin-client-export

<!-- Appended by evaluator subagent after each N.E EVAL run -->

- group: 1
  attempt: 1
  scores: {spec: 95, runtime: 100, code: 90}
  total: 96
  status: PASS
  findings:
    - "spec: All SHALL statements met — endpoint POST/GET, ownership validation, CSV/ZIP modes, streaming, 200-client cap"
    - "spec: Client name sanitization (replaceAll forbidden chars) and CSV quoting (double-quote escaping) verified in code"
    - "runtime: All 20 tests pass (13 service + 7 controller), no regressions"
    - "code: Double Content-Type header in controller (lines 48-49) — redundant but not incorrect"
    - "code: Missing @NotNull/@NotBlank bean validation on ExportRequest record — validation in service instead"
    - "code: streamCombinedZip correctly does NOT throw on empty docs (per spec, only documents-only mode throws)"

- group: 2
  attempt: 1
  scores: {spec: 65, runtime: 95, code: 60}
  total: 76
  status: RETRY
  findings:
    - "spec: Checkbox column, select-all, filter-clear, toolbar, dialog all fully implemented and tested"
    - "spec: CRITICAL — No loading indicator on Export button; button not disabled during flight; violates SHALL requirement"
    - "spec: CRITICAL — Error handling generic ('Export failed. Please try again.') does NOT display actual 400/403 server error message; violates SHALL requirement"
    - "runtime: 36/38 tests pass; 2 pre-existing failures (shows Linked badge, shows Not linked badge) excluded per contract"
    - "runtime: All 9 group-2 multi-select and export tests pass"
    - "code: Service downloadExport() correctly handles blob download with URL.createObjectURL pattern per D6"
    - "code: adminClientsComponent.ts toggleSelection() correctly enforces 200-client cap with Set deduplication"
    - "code: Component effect() correctly clears selection on nameFilter/emailFilter changes per D7"
    - "code: No isExporting signal; Export button has no loading state, spinner, or disabled attribute"
    - "code: Error observer in openExportDialog() line 185 never extracts error body; snackBar message is hardcoded generic"

- group: 2
  attempt: 2
  scores: {spec: 80, runtime: 100, code: 75}
  total: 87
  status: PASS
  findings:
    - "spec: All 10 SHALL requirements verified and implemented: checkbox column, select-all, filter-clear on name/email change, toolbar visibility, dialog with checkboxes/year-selector, loading state on button, file download, error snackbar, 200-client cap"
    - "spec: MEDIUM — selectAll() line 170 checks ids.length > 200 instead of merged.size > 200; cap message not shown when select-all would push total >200 if pre-filtered results are <200; e.g. user has 150 selected, filters to 80, select-all → 230 total but no cap message shown"
    - "runtime: 36/38 tests pass, 2 pre-existing failures (Linked/Not linked badges) excluded per contract; all 9 group-2 multi-select/export tests pass; no new test failures"
    - "code: isExporting signal, disabled button, mat-spinner all correct — fixes attempt 1 critical issue"
    - "code: Effect in constructor correctly clears selection on nameFilter/emailFilter changes per D7"
    - "code: toggleSelection correctly enforces 200-cap via Set.size check at line 154"
    - "code: Error handler fragility — line 190 assumes err.error.message exists, but if service's JSON.parse fails (line 57), original HttpErrorResponse is re-emitted; err.error would be Blob, not parsed object; mostly mitigated by server returning valid JSON in error responses"
    - "code: downloadExport filename parsing regex at line 70 is fragile (filename='\"?([^\"]+)\"?' works for standard Content-Disposition but could fail on edge cases like spaces before quotes)"
  fix_tasks:
    - "2.F1 selectAll — line 170: check 'merged.size > 200' instead of 'ids.length > 200' to show cap message when selection reaches cap"
    - "2.F2 tests — add selectAll edge case: pre-selected + filtered select-all that hits cap should show capMessage"
