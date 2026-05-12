# Design: Contact Form — Post-Submit Success State

**Date:** 2026-05-12
**Status:** Draft — produced via /opsx:explore

## Context

The contact form at `frontend/src/app/features/contact/contact.component.ts` currently handles a successful send as follows:

```ts
next: () => {
  this.form.reset();
  this.snackBar.open("Thanks — we'll reply soon", undefined, { duration: 3000 });
}
```

This produces three problems:

1. **Validation errors flash red after a successful send.** Calling `FormGroup.reset()` clears values and resets `touched`/`dirty`, but it does **not** reset the underlying `<form>` directive's `submitted` state. Angular Material's default `ErrorStateMatcher` shows `<mat-error>` when the control is invalid AND (`touched` OR the parent form is `submitted`). After a successful send, the required fields become empty (invalid), and the form remains in `submitted = true` until the directive itself is reset. Result: the user sees "Name is required", "Enter a valid email address", etc. immediately after the success snackbar — a confusing UX.
2. **The snackbar is ephemeral.** A 3-second toast at the bottom of the viewport is easy to miss, especially on mobile where the user may already be scrolling away from the form.
3. **The confirmation lacks context.** A toast detached from the form leaves the cleared fields looking like a failed submission rather than a successful one.

The fix is small but touches form-directive semantics that are easy to get wrong, so it's worth specifying carefully.

## Goals / Non-Goals

**Goals:**
- After a successful send, all form fields are cleared and **no `<mat-error>` is visible for any field**. (Normal field-level validation continues to work while the user is composing — this Goal applies only to the post-success state.)
- An inline confirmation message ("Thanks — we'll reply soon") appears below the Send button and stays visible until the user types in any field.
- The error path continues to surface failure clearly (the existing error snackbar is fine).
- New behavior is covered by tests, specifically:
  1. After a successful submit, no `mat-error` element is rendered for any field. (The load-bearing assertion — guards against future regressions where someone replaces `resetForm()` with `reset()`.)
  2. After a successful submit, the inline confirmation block is rendered.
  3. After the confirmation is showing, typing in any input hides it.
  4. The error path still opens the error snackbar (existing behavior preserved).
- An E2E Playwright test in `e2e/` covers the success flow end-to-end (per CLAUDE.md's UI-flow E2E requirement).

**Non-Goals:**
- Redesigning the contact form layout, styles, or copy beyond adding the confirmation block.
- Changing backend behavior or the `ContactService` contract.
- Adding a second submission while the confirmation is showing (the user can still click Send, but they must edit a field first — which is already the natural UX since the form is empty).
- Replacing the error snackbar with an inline error block. Out of scope; revisit later if desired.

## Approach

### Existing test that must be replaced

`frontend/src/app/features/contact/contact.component.spec.ts` (around lines 76–88) currently asserts that a successful submit calls `snackBarMock.open(...)` with the success string. Removing the success snackbar makes this assertion fail. The test must be **replaced** (not just renamed) with assertions that match the new behavior: form is reset, inline confirmation appears, no `mat-error` is rendered, and no success snackbar is opened.

### Three coordinated changes

```
┌──────────────────────────────────────────────────────────────────────┐
│ 1. Reset the form DIRECTIVE, not just the FormGroup                  │
│    Use @ViewChild(FormGroupDirective) and call resetForm().          │
│    This resets values AND the submitted state → no error flash.      │
├──────────────────────────────────────────────────────────────────────┤
│ 2. Add an inline confirmation block, signal-driven                   │
│    showConfirmation = signal(false)                                  │
│    Template: @if (showConfirmation()) { <success block> }            │
│    Set true on success; remove the success snackbar entirely.        │
├──────────────────────────────────────────────────────────────────────┤
│ 3. Clear the confirmation when the user starts typing                │
│    Bind (input) on the <form> element to hide the confirmation.      │
│    Programmatic resetForm() does NOT dispatch input events, so       │
│    the success-path reset doesn't immediately re-hide the message.   │
└──────────────────────────────────────────────────────────────────────┘
```

### State flow

```
INITIAL ─────────────────────────────────────────────────► EMPTY FORM, no errors
   │
   │ user types, blurs, validation errors appear normally
   ▼
TYPING ──────────────────────────────────────────────────► VALID FORM
   │
   │ click Send → submitting=true
   ▼
SENDING ─────────────────────────────────────────────────► spinner in button
   │
   ├─ success: formGroupDirective.resetForm()
   │           showConfirmation.set(true)
   │           submitting=false
   │           NO snackbar
   ▼
SUCCESS ─────────────────────────────────────────────────► empty fields,
   │                                                       no errors,
   │                                                       inline ✓ message
   │ user types in any input → (input) event
   ▼
TYPING (again) ──────────────────────────────────────────► showConfirmation.set(false)
                                                           normal form behavior
   │
   └─ error: snackBar.open('Something went wrong...', 'OK')
             submitting=false
             form values preserved (current behavior)
```

### Component sketch

```ts
import { Component, signal, viewChild } from '@angular/core';
import { FormBuilder, FormGroup, FormGroupDirective, Validators, ReactiveFormsModule } from '@angular/forms';
// ...

export class ContactComponent {
  form: FormGroup;
  submitting = signal(false);
  showConfirmation = signal(false);

  private formDirective = viewChild.required(FormGroupDirective);

  constructor(/* ... */) { /* unchanged */ }

  submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.contactService.send(this.form.value).pipe(
      finalize(() => this.submitting.set(false)),
    ).subscribe({
      next: () => {
        this.formDirective().resetForm();   // ← clears values + submitted state
        this.showConfirmation.set(true);    // ← inline message
      },
      error: () => {
        this.snackBar.open('Something went wrong. Please try again.', 'OK');
      },
    });
  }

  onFormInput(): void {
    if (this.showConfirmation()) {
      this.showConfirmation.set(false);
    }
  }
}
```

### Template changes

```html
<form
  [formGroup]="form"
  (ngSubmit)="submit()"
  (input)="onFormInput()"
  class="contact-form"
  novalidate>
  <!-- ... existing fields unchanged ... -->

  <button mat-stroked-button ...>...</button>

  @if (showConfirmation()) {
    <div class="confirmation-block" role="status" aria-live="polite">
      <mat-icon>check_circle</mat-icon>
      <span>Thanks — we'll reply soon.</span>
    </div>
  }
</form>
```

### E2E coverage

Per CLAUDE.md (*"every change that introduces or modifies a UI flow must include a Playwright test in `e2e/` covering that flow"*), a Playwright test must accompany this change. Minimum flow:

```
1. Navigate to /contact
2. Fill name, email, subject, message with valid values
3. Click Send Message
4. Wait for the inline confirmation block to appear ("Thanks — we'll reply soon")
5. Assert no `.mat-mdc-form-field-error` elements are visible anywhere in the form
6. Assert all four visible inputs are cleared
7. Type a character into the name field
8. Assert the inline confirmation block is no longer rendered
```

Backend can be stubbed via Playwright route interception so the test doesn't depend on an email send actually completing.

### Style sketch (dark theme, matches existing form panel)

```css
.confirmation-block {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 14px 16px;
  border-radius: 8px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.25);
  color: #cbd5e1;
  font-size: 14px;
  animation: fadeSlideUp 0.3s ease both;
}
.confirmation-block mat-icon {
  color: #38bdf8;
  font-size: 20px;
  width: 20px;
  height: 20px;
}
```

## Decisions

### Decision: Use `FormGroupDirective.resetForm()` instead of `FormGroup.reset()`
**Choice:** `viewChild.required(FormGroupDirective)` + `formDirective().resetForm()`.
**Alternatives considered:**
- Custom `ErrorStateMatcher` that ignores `submitted` state — works, but every `<mat-form-field>` would need `[errorStateMatcher]="..."` wiring and the matcher itself becomes a piece of code to remember. Heavier than the gotcha justifies.
- Call `form.reset()` then manually toggle `markAsPristine()`/`markAsUntouched()` — doesn't fix the underlying `submitted` flag on the directive, so errors still flash. Doesn't work.
- Wrap the field in `*ngIf` keyed to `showConfirmation` so the controls remount — destroys/recreates DOM unnecessarily and causes visible flicker.

**Rationale:** `resetForm()` is the documented Angular API for exactly this situation. It resets values, control states (`touched`, `dirty`, `pristine`), AND the directive's `submitted` flag. One call, no custom code, idiomatic.

### Decision: Replace the success snackbar entirely (don't keep both)
**Choice:** Remove the snackbar from the success path. Keep it only for errors.
**Alternatives considered:**
- Keep both (inline + snackbar) — "belt and suspenders" but redundant and noisy.
- Keep snackbar only — user explicitly asked for inline confirmation; the form panel is the natural focal point after submission.

**Rationale:** The inline block is more visible, persistent, and stays anchored to the form the user just used. The snackbar adds nothing once we have the inline element.

### Decision: Dismiss confirmation on `(input)` event, not on form `valueChanges`
**Choice:** Template binding `(input)="onFormInput()"` on the `<form>` element.
**Alternatives considered:**
- Subscribe to `form.valueChanges` — fires on programmatic resets too, so we'd need a flag to ignore the reset-triggered emission. Indirect and easy to get wrong.
- `(focus)` on each field — would dismiss when the user just clicks into a field without intending to send another. Too aggressive; the dismissal should signal "user is composing a new message".
- Hide on a timer (auto-dismiss) — user explicitly rejected this; they want it persistent until the user signals they're moving on.

**Rationale:** The native `input` event bubbles from all inputs/textareas. It fires on user keystrokes but NOT on programmatic `resetForm()` (which sets `.value` without dispatching events). Exactly the trigger semantics we want, expressed in one line of template.

### Decision: Error path retains the snackbar (unchanged)
**Choice:** No inline error block in this change.
**Rationale:** Scope discipline. Errors are exceptional; the inline mechanism is justified by the success case being common and the cleared-form-without-confirmation feeling broken. The error toast continues to work.

## Risks / Trade-offs

- **Risk:** `viewChild.required(FormGroupDirective)` returns a `Signal<FormGroupDirective>`; calling it before view init throws. → **Mitigation:** We only call `formDirective()` inside `submit()`, which can only fire after the view is initialized (the button must exist to be clicked).
- **Risk:** The honeypot field (`companyUrl`) is part of the same form. After `resetForm()` it's cleared correctly, but `(input)` would fire if anything ever programmatically dispatched an input event on it. → **Mitigation:** The honeypot is positioned off-screen with `tabindex="-1"` and `aria-hidden="true"`; humans can't focus it. No real risk; noted for completeness.
- **Risk:** Screen-reader users may not notice the inline block. → **Mitigation:** `role="status"` + `aria-live="polite"` on the confirmation block announces the message without interrupting focus.
- **Trade-off:** Removing the snackbar means users who scrolled away from the form (e.g., on mobile, jumped to the info panel after sending) won't see immediate feedback. → **Mitigation:** Acceptable because (a) the form panel is the area the user just interacted with, so focus is naturally there; (b) `aria-live` still announces it for assistive tech; (c) the Send button changes from "Sending…" back to "Send Message" providing tactile feedback that something happened.

## Migration Plan

Not applicable — purely a frontend behavior change with no schema, API, or storage impact. Ship behind no flag; the change is small and reversible by revert.

## UI

Selected mockup (confirmed with user):

```
┌────────────────────────────────┐
│ Send a Message                 │
│ All fields are required.       │
│                                │
│ ┌──────┐  ┌──────┐             │
│ │ Name │  │ Email│             │
│ └──────┘  └──────┘             │
│ ┌────────────────────────────┐ │
│ │ Subject                    │ │
│ └────────────────────────────┘ │
│ ┌────────────────────────────┐ │
│ │ Message                    │ │
│ └────────────────────────────┘ │
│ ┌────────────────────────────┐ │
│ │  Send Message    →         │ │
│ └────────────────────────────┘ │
│ ┌────────────────────────────┐ │
│ │ ✓ Thanks — we'll reply soon│ │  ← NEW (visible after success,
│ └────────────────────────────┘ │     hidden once user types again)
└────────────────────────────────┘
```

- Confirmation block sits inside `<form>`, directly below the Send button.
- Cyan accent (`#38bdf8` on a translucent cyan background) — matches the existing dark-theme palette already used in the info panel and form-field focus states.
- `role="status"` + `aria-live="polite"` for screen-reader announcement.
- Persists until the user types in any field; then disappears via the `(input)` handler.

## Open Questions

1. Should the confirmation block also dismiss if the user navigates away and returns to the contact page? **Tentative answer:** Not in this change. State is component-local and naturally resets on navigation/remount; nothing to do.
2. Should the inline error case also become inline (matching the success treatment)? **Tentative answer:** Defer. The user only asked for the success case; we can revisit symmetrically if the snackbar-for-errors feels off after this ships.
3. Should focus move to the confirmation block on success, instead of relying solely on `aria-live="polite"`? **Tentative answer:** Defer — `aria-live` is the standard pattern and moving focus away from the button can be disorienting for sighted keyboard users. Revisit if assistive-tech feedback says the announcement is being missed.
