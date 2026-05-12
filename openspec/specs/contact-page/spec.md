## ADDED Requirements

### Requirement: Render contact form

The `/contact` page SHALL render a reactive form containing four user-visible fields — name, email, subject, message — plus a Send Message submit button. The form layout SHALL place the form card on the left (~2/3 width on desktop) alongside a combined "Find Us" sidebar card on the right (~1/3 width). On viewports narrower than the desktop breakpoint, the two cards MUST stack vertically (form on top, Find Us card below).

#### Scenario: Initial page render shows all four fields and the submit button

- **WHEN** a visitor navigates to `/contact`
- **THEN** the page MUST render a form with input fields labeled "Name", "Email", "Subject", and "Message" (textarea), AND a Send Message button rendered as a `mat-stroked-button` with `color="primary"`.

#### Scenario: Desktop layout has two side-by-side cards

- **WHEN** a visitor opens `/contact` on a viewport ≥ 900px wide
- **THEN** the form card MUST occupy approximately the left two-thirds of the page width AND the combined "Find Us" card MUST occupy the right one-third.

#### Scenario: Mobile layout stacks the cards

- **WHEN** a visitor opens `/contact` on a viewport < 900px wide
- **THEN** the form card MUST appear above the Find Us card in a single column.

---

### Requirement: Display firm contact details and map

The combined "Find Us" sidebar card SHALL display the firm's address, phone number, email address, and business hours as four labeled rows, and SHALL embed a Google Map iframe directly below those rows, all inside a single `mat-card`.

#### Scenario: Find Us card lists the four contact rows

- **WHEN** a visitor opens `/contact`
- **THEN** the Find Us card MUST show four rows in this order: Address, Phone, Email, Hours — each with the configured value displayed alongside its label.

#### Scenario: Find Us card embeds a Google Map iframe

- **WHEN** a visitor opens `/contact`
- **THEN** the Find Us card MUST contain a single `<iframe>` element whose `src` URL points at a Google Maps embed for the firm's office address.

---

### Requirement: Validate the contact form client-side

The reactive form SHALL enforce required-field and format validation on each control. The Send Message button MUST be disabled while the form is invalid. Invalid fields MUST display Angular Material validation errors below the corresponding field.

#### Scenario: Submit button is disabled when name is empty

- **WHEN** the visitor leaves the Name field empty and other fields are valid
- **THEN** the Send Message button MUST be disabled AND the Name field MUST show a "required" validation error after it is touched.

#### Scenario: Submit button is disabled for invalid email format

- **WHEN** the visitor enters "not-an-email" in the Email field
- **THEN** the Send Message button MUST be disabled AND the Email field MUST show an "invalid email" validation error.

#### Scenario: Submit button is disabled when message exceeds 5000 characters

- **WHEN** the visitor types a Message longer than 5000 characters
- **THEN** the Send Message button MUST be disabled AND the Message field MUST show a "too long" validation error.

---

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

---

### Requirement: Accept and persist contact submissions

The backend SHALL expose `POST /api/contact` that accepts a JSON body matching `ContactSubmissionRequest` (name, email, subject, message, companyUrl), validates the input, persists a row to the `contact_messages` table, and returns HTTP 202 on success.

#### Scenario: Valid submission returns 202 and persists a row

- **WHEN** a client POSTs a valid JSON body to `/api/contact`
- **THEN** the server MUST respond with HTTP 202 (Accepted) AND a new row MUST exist in `contact_messages` whose `name`, `email`, `subject`, and `message` columns match the request, with `submitted_at` populated by the database.

#### Scenario: Missing required field returns 400

- **WHEN** a client POSTs a body missing the `name` field (or `email`, `subject`, or `message`)
- **THEN** the server MUST respond with HTTP 400 AND MUST NOT persist a row.

#### Scenario: Invalid email format returns 400

- **WHEN** a client POSTs a body where `email` fails `@Email` validation
- **THEN** the server MUST respond with HTTP 400 AND MUST NOT persist a row.

#### Scenario: Subject over 200 characters returns 400

- **WHEN** a client POSTs a body where `subject` exceeds 200 characters
- **THEN** the server MUST respond with HTTP 400 AND MUST NOT persist a row.

#### Scenario: Message over 5000 characters returns 400

- **WHEN** a client POSTs a body where `message` exceeds 5000 characters
- **THEN** the server MUST respond with HTTP 400 AND MUST NOT persist a row.

---

### Requirement: Permit unauthenticated access to the contact endpoint

`POST /api/contact` SHALL be accessible without authentication. All other `/api/**` endpoints MUST continue to require a valid session/JWT, and `GET /api/contact` (or any other method on `/api/contact`) MUST remain protected by the default `/api/**` authenticated rule.

#### Scenario: Unauthenticated POST is permitted

- **WHEN** an unauthenticated client POSTs a valid body to `/api/contact`
- **THEN** the server MUST process the request (not return 401).

#### Scenario: Unauthenticated GET on /api/contact is still rejected

- **WHEN** an unauthenticated client sends `GET /api/contact`
- **THEN** the server MUST respond with HTTP 401.

#### Scenario: Other /api endpoints remain protected

- **WHEN** an unauthenticated client sends a request to any `/api/**` path other than `POST /api/contact`
- **THEN** the server MUST respond with HTTP 401.

---

### Requirement: Reject honeypot submissions silently

A hidden honeypot form field named `companyUrl` SHALL be rendered off-screen with `tabindex="-1"` and `aria-hidden="true"`. Submissions where `companyUrl` is non-empty MUST be silently dropped — the server returns HTTP 200 (so the bot perceives success and does not retry) but does NOT persist a row, does NOT send an email, and does NOT count against the rate limit.

#### Scenario: Honeypot-filled submission returns 200 without persisting

- **WHEN** a client POSTs a body whose `companyUrl` field is non-empty
- **THEN** the server MUST respond with HTTP 200 AND MUST NOT insert a row into `contact_messages` AND MUST NOT invoke the mail sender.

#### Scenario: Honeypot field is invisible to keyboard and screen-reader users

- **WHEN** a visitor tabs through the form
- **THEN** focus MUST NOT land on the `companyUrl` input AND assistive technologies MUST report the field as hidden (`aria-hidden="true"`).

---

### Requirement: Rate-limit submissions per IP

The backend SHALL enforce a fixed-window rate limit of 5 submissions per client IP per 1-hour window. The client IP is derived solely from `HttpServletRequest.getRemoteAddr()` — `X-Forwarded-For` MUST be ignored to prevent spoofing. When the limit is exceeded the server MUST respond with HTTP 429.

#### Scenario: Sixth submission from same IP within one hour is rejected

- **WHEN** the same client IP has already submitted 5 accepted requests within the current hourly window AND attempts a sixth
- **THEN** the server MUST respond with HTTP 429 AND MUST NOT persist the sixth submission.

#### Scenario: Different IPs have independent buckets

- **WHEN** client IP A has already submitted 5 accepted requests in the current window AND client IP B submits its first
- **THEN** the request from IP B MUST be accepted (no 429).

#### Scenario: X-Forwarded-For header is ignored for rate limiting

- **WHEN** a client sets `X-Forwarded-For: <other-ip>` and POSTs to `/api/contact`
- **THEN** the rate-limit bucket MUST be keyed by the TCP-level `getRemoteAddr()` value, NOT the spoofed header value.

---

### Requirement: Send notification email after persisting

After successfully persisting a contact message, the backend SHALL send a notification email through Spring's `JavaMailSender`. The email's subject MUST follow the format `[Contact] {subject}`. The recipient MUST be the address configured via `CONTACT_NOTIFICATION_EMAIL`. The `from` address MUST be `CONTACT_FROM_EMAIL` if set, otherwise `SPRING_MAIL_USERNAME`.

#### Scenario: Email is sent after a successful persist

- **WHEN** a valid submission is persisted
- **THEN** `JavaMailSender.send(...)` MUST be invoked exactly once with a `SimpleMailMessage` whose subject is `"[Contact] " + <submitted subject>` AND whose `to` matches `CONTACT_NOTIFICATION_EMAIL`.

#### Scenario: From address falls back to mail username

- **WHEN** `CONTACT_FROM_EMAIL` is unset and a valid submission is persisted
- **THEN** the outgoing email's `from` MUST equal `SPRING_MAIL_USERNAME`.

#### Scenario: From address uses explicit override when set

- **WHEN** `CONTACT_FROM_EMAIL` is set to `no-reply@firm.com` and a valid submission is persisted
- **THEN** the outgoing email's `from` MUST equal `no-reply@firm.com`.

---

### Requirement: Treat email-sending failure as non-fatal to the client

If `JavaMailSender.send(...)` throws `MailException`, the service SHALL log a WARN entry that includes the persisted `contact_messages.id`, MUST NOT roll back the DB write, and MUST still return HTTP 202 to the client. Email failure is an internal operational concern, not a visitor-facing error.

#### Scenario: SMTP failure does not propagate to the client

- **WHEN** the persist succeeds but `JavaMailSender.send(...)` throws `MailException`
- **THEN** the server MUST respond with HTTP 202 AND the persisted row MUST remain in `contact_messages` AND a WARN log entry MUST be emitted containing the row id.

---

### Requirement: Provide dev-friendly mail behavior

When the active Spring profile is `dev`, the application SHALL use a `LoggingMailSender` bean (annotated `@Profile("dev")`) that implements `JavaMailSender` by logging the message and discarding it. Local developers MUST be able to run the application end-to-end without configuring SMTP credentials.

#### Scenario: Dev profile uses logging mail sender

- **WHEN** the application starts with `spring.profiles.active=dev` AND a valid submission is persisted
- **THEN** the persist MUST succeed AND no external SMTP connection MUST be attempted AND a log entry MUST record the message subject and recipient.

---

### Requirement: Fail fast in prod on missing mail configuration

When the active Spring profile is `prod`, the application SHALL fail to start if any of the required mail configuration values is missing: `SPRING_MAIL_HOST`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, or `CONTACT_NOTIFICATION_EMAIL`. The failure MUST occur during Spring context initialization (not on the first submission attempt). Enforcement is implemented by a `@ConfigurationProperties @Validated` class — `application-prod.yml` alone cannot enforce this.

#### Scenario: Missing CONTACT_NOTIFICATION_EMAIL fails startup

- **WHEN** the application starts with `spring.profiles.active=prod` AND `CONTACT_NOTIFICATION_EMAIL` is unset
- **THEN** Spring MUST fail to start AND the error message MUST identify the missing property.

#### Scenario: All values present allows startup

- **WHEN** the application starts with `spring.profiles.active=prod` AND all required mail env vars are set to non-blank values
- **THEN** Spring MUST start successfully.

---

### Requirement: Persist new submissions via Flyway migration

The database schema SHALL include a `contact_messages` table created by Flyway migration `V7__create_contact_messages.sql`. The table SHALL contain columns `id BIGSERIAL PK`, `name VARCHAR(200) NOT NULL`, `email VARCHAR(254) NOT NULL`, `subject VARCHAR(200) NOT NULL`, `message TEXT NOT NULL`, `submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, and `ip_address VARCHAR(45)`. An index on `submitted_at DESC` MUST exist for reverse-chronological reads.

#### Scenario: Migration creates the table with expected columns

- **WHEN** the application starts against a fresh database AND Flyway has run
- **THEN** the `contact_messages` table MUST exist with exactly the columns and constraints listed above.

#### Scenario: Index on submitted_at exists

- **WHEN** the migration has run
- **THEN** an index `idx_contact_messages_submitted_at` on `submitted_at DESC` MUST exist.
