# Lessons: contact-success-state

**Archived:** 2026-05-12
**Change directory:** `openspec/changes/archive/2026-05-12-contact-success-state/`

## Scope vs. reality

- Shipped exactly as designed — no scope drift. The proposal's surgical-change discipline held: backend, layout, and error-path snackbar were untouched.

## Recurring review findings

- Two "Important" findings in Group 2: `showConfirmation` not reset at the top of `submit()` (stale confirmation visible before the next response) and a CSS comment displaced from its keyframe by the new block. Both are symptoms of the same pattern: adding new state/styles adjacent to existing code without re-reading the surrounding context.
- Two "Important" findings in Group 3: the hide-on-input test only covered the first keystroke (not subsequent ones) and had no coverage for the no-op guard. Multi-step behavioral paths need explicit test cases for each step, not just the entry.

## TDD observations

- RED phase for Group 1 required calling `btn.click()` rather than `component.submit()` directly — only the DOM click sets `FormGroupDirective.submitted = true`. The task description assumed `submit()` was sufficient, which would have produced a false RED (test passing before the fix).
- All three RED failures produced clear, specific assertion errors that directly identified the missing implementation, making GREEN straightforward in each group.

## Surprises / things to anticipate next time

- `FormGroup.reset()` vs `FormGroupDirective.resetForm()`: Angular's `form.reset()` is insufficient after a submitted form — it clears values but leaves the directive's `submitted` flag true, causing Material's `ErrorStateMatcher` to re-render `<mat-error>` on now-empty required fields. Always use `viewChild.required(FormGroupDirective)` + `resetForm()` to reset a form after submit.
- `(input)` event on `<form>` is the right dismiss trigger for clearing confirmation state, not `form.valueChanges` — `valueChanges` fires on programmatic `resetForm()`, which would immediately hide the confirmation it just triggered.
- `sed` used for checkbox updates hit a silent failure when line numbers shifted by one. Use the Edit tool (content-matched) for all file edits — it fails loudly if the target string isn't found.
- Two pre-existing issues exposed but left unresolved (out of scope): dead `MatCardModule` import in `contact.component.ts` and a broken E2E mobile-layout test using the old `mat-card` selector. Both are tracked in the dev log To Do.
