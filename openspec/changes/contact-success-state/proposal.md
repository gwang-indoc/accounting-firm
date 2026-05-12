## Why

When a user successfully sends a message through the contact form, the cleared required fields immediately flash red `mat-error` messages ("Name is required", "Enter a valid email address", etc.) — making a successful submission visually indistinguishable from a failed one. The accompanying 3-second snackbar is easy to miss, especially on mobile, leaving the user uncertain whether anything was sent at all. This change fixes the post-submit UX by ensuring (a) the form clears cleanly with no validation errors, and (b) the confirmation persists inline below the Send button where the user just was.

## What Changes

- Reset the underlying `FormGroupDirective` (not just the `FormGroup`) on success, so the form's `submitted` state is cleared and Material's `<mat-error>` elements no longer render for empty required fields.
- Replace the transient success snackbar with a persistent inline confirmation block ("✓ Thanks — we'll reply soon") rendered below the Send button.
- Auto-dismiss the inline confirmation when the user types into any form field (signaling intent to compose a new message), via a native `(input)` event handler on the `<form>` element.
- Replace the existing `contact.component.spec.ts` test that asserted the success snackbar with new tests covering: no `mat-error` after success, inline confirmation appears, confirmation hides on user input.
- Add a Playwright E2E test under `e2e/` covering the full success flow (per CLAUDE.md's UI-flow E2E requirement).
- **BREAKING**: None. The error path is unchanged; only the success path's UI is affected.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `contact-page`: Post-submit success behavior changes — the success snackbar is removed in favor of an inline confirmation block, and validation errors must not be visible after a successful submission. The error-path snackbar and all pre-submit validation behavior are unchanged.

## Non-Goals (Out of Scope)

- Redesigning the contact form layout, styles, or copy beyond adding the confirmation block.
- Changing backend behavior, the `ContactService` HTTP contract, or the `/api/contact` endpoint.
- Replacing the error-path snackbar with an inline error block (defer; revisit symmetrically if needed after this ships).
- Moving keyboard focus to the confirmation block on success (defer; `aria-live="polite"` is the standard pattern).
- Adding `prefers-reduced-motion` support to the confirmation block's entrance animation. The existing contact-page CSS does not honor reduced-motion either; matching the existing posture is intentional (surgical change discipline).

## Impact

- **Frontend code**:
  - `frontend/src/app/features/contact/contact.component.ts` — add `showConfirmation` signal, swap `form.reset()` for `formDirective().resetForm()` via `viewChild.required(FormGroupDirective)`, remove success-path snackbar, add `onFormInput()` handler.
  - `frontend/src/app/features/contact/contact.component.html` — bind `(input)="onFormInput()"` on the `<form>`, add the conditional inline confirmation block below the Send button.
  - `frontend/src/app/features/contact/contact.component.css` — add `.confirmation-block` styling (reuses existing `fadeSlideUp` keyframe).
- **Frontend tests**:
  - `frontend/src/app/features/contact/contact.component.spec.ts` — replace the "snackbar shows success message" test (lines 76–88) with new assertions; add tests for inline confirmation appearing, no `mat-error` after success, and confirmation hiding on user input.
- **E2E tests**:
  - `e2e/` — new Playwright spec covering the success flow with backend stubbed via route interception.
- **Backend**: No changes.
- **Database / migrations**: No changes.
- **Dependencies**: No new packages.
- **Documentation**: Dev log entry for the date the change is applied (`docs/log/YYYY-MM-DD.md`). Per-change lessons file authored at `/opsx:archive` time.
