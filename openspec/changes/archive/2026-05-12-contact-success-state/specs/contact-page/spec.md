## MODIFIED Requirements

### Requirement: Submit the contact form

When the form is valid and the visitor clicks Send Message, the application SHALL POST the form payload as JSON to `/api/contact`. The Send Message button MUST become disabled and indicate an in-flight state for the duration of the request. On HTTP 202 the form MUST be reset such that all values are cleared AND no field-level validation errors are rendered (the form returns to its pristine, untouched, not-yet-submitted state). On any other response the form values MUST be preserved so the visitor can retry.

#### Scenario: Valid submission POSTs JSON to /api/contact

- **WHEN** the visitor clicks Send Message with all fields valid
- **THEN** the frontend MUST issue a single `POST /api/contact` request with a JSON body containing `name`, `email`, `subject`, `message`, and `companyUrl` (the honeypot, normally empty).

#### Scenario: In-flight state disables the Send button

- **WHEN** the request is in flight
- **THEN** the Send Message button MUST be disabled until the response arrives.

#### Scenario: Successful submission resets the form with no validation errors visible

- **WHEN** the backend returns HTTP 202
- **THEN** all four user-visible form fields MUST be cleared AND no Angular Material validation error (`mat-error`) MUST be rendered for any field, even though the now-empty required fields are technically invalid.

#### Scenario: Failed submission preserves the form values

- **WHEN** the backend returns any non-2xx response
- **THEN** the four user-visible form fields MUST retain the values the visitor entered.

---

### Requirement: Show success and error feedback via snackbar

The application SHALL surface submission feedback to the visitor through two distinct mechanisms: a persistent inline confirmation block for successful submissions, and a `MatSnackBar` notification for errors. The inline confirmation block SHALL appear within the form panel directly below the Send Message button, SHALL announce itself to assistive technology via `role="status"` and `aria-live="polite"`, and SHALL persist until the visitor types into any form field (signaling intent to compose a new message), at which point it MUST disappear. The success snackbar is no longer used.

#### Scenario: Inline confirmation appears after 202

- **WHEN** the backend returns HTTP 202
- **THEN** an inline confirmation block MUST appear below the Send Message button containing the text "Thanks — we'll reply soon" AND the block MUST have `role="status"` and `aria-live="polite"` attributes AND no `MatSnackBar` MUST be opened.

#### Scenario: Inline confirmation hides when the visitor types in any field

- **WHEN** the inline confirmation block is currently visible AND the visitor types a character into any of the Name, Email, Subject, or Message fields
- **THEN** the inline confirmation block MUST no longer be rendered.

#### Scenario: Inline confirmation does not reappear on subsequent keystrokes

- **WHEN** the inline confirmation block has been hidden by a prior keystroke AND the visitor continues typing
- **THEN** the inline confirmation block MUST remain hidden until the next successful submission.

#### Scenario: Error snackbar appears after failure

- **WHEN** the backend returns HTTP 4xx or 5xx (other than honeypot silent-accept)
- **THEN** a `MatSnackBar` MUST appear with an error message AND an "OK" action button to dismiss AND no inline confirmation block MUST be rendered.
