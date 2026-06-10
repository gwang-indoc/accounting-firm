# Contact Form

> Sources: Project OpenSpec, 2026-05-21
> Raw: [openspec-contact-page](../../raw/api/openspec-contact-page.md)

## Overview

The `/contact` page provides a public contact form with client-side validation, a backend persist-and-notify pipeline, IP-based rate limiting, honeypot bot protection, and profile-aware email behavior. The `POST /api/contact` endpoint is publicly accessible; all other methods on `/api/contact` remain protected.

## Frontend

**Layout:** Two-card split — form card (~2/3 width) + "Find Us" sidebar card (~1/3 width). Cards stack vertically on viewports < 900px.

**Form fields:** Name, Email, Subject, Message (textarea). All required. Hidden honeypot field `companyUrl` rendered off-screen with `tabindex="-1"` and `aria-hidden="true"`.

**Validation (client-side):**
- All fields required
- Email: valid format
- Message: max 5000 characters
- Submit button disabled while form is invalid

**Submission:** POSTs JSON `{ name, email, subject, message, companyUrl }` to `/api/contact`. Button disabled during flight.

**Success (202):**
- Form resets to pristine state (no validation errors visible)
- Inline confirmation block appears below button: "Thanks — we'll reply soon" (`role="status"`, `aria-live="polite"`)
- Confirmation hides when the visitor types in any field
- No MatSnackBar opened

**Error (4xx/5xx):** Form values preserved. `MatSnackBar` with error message + "OK" dismiss button. No inline confirmation.

## Backend

### Endpoint

`POST /api/contact` — accepts `ContactSubmissionRequest { name, email, subject, message, companyUrl }`.

**Validation → 400 if:**
- Any of name / email / subject / message missing
- Email fails `@Email` format
- Subject > 200 characters
- Message > 5000 characters

**Success:** Persists row to `contact_messages`, sends notification email, returns 202.

### Honeypot

Non-empty `companyUrl` → returns 200 silently without persisting a row, sending email, or counting against rate limit.

### Rate Limiting

Fixed-window: 5 accepted submissions per client IP per 1-hour window. IP derived from `HttpServletRequest.getRemoteAddr()` only — `X-Forwarded-For` is ignored to prevent spoofing. Exceeding limit → 429.

### Email Notification

`JavaMailSender` sends after successful persist:
- Subject: `[Contact] {submitted subject}`
- To: `CONTACT_NOTIFICATION_EMAIL`
- From: `CONTACT_FROM_EMAIL` if set, else `SPRING_MAIL_USERNAME`

`MailException` → WARN log (includes `contact_messages.id`), no DB rollback, still returns 202.

### Profile Behavior

**`dev` profile:** `LoggingMailSender` bean (`@Profile("dev")`) logs and discards messages — no SMTP connection needed.

**`prod` profile:** `@ConfigurationProperties @Validated` class fails Spring context startup if any of `SPRING_MAIL_HOST`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, or `CONTACT_NOTIFICATION_EMAIL` is missing. Fails at startup, not on first submission.

## Database

Flyway migration `V7__create_contact_messages.sql`:

| Column | Type | Constraint |
|---|---|---|
| `id` | BIGSERIAL | PK |
| `name` | VARCHAR(200) | NOT NULL |
| `email` | VARCHAR(254) | NOT NULL |
| `subject` | VARCHAR(200) | NOT NULL |
| `message` | TEXT | NOT NULL |
| `submitted_at` | TIMESTAMPTZ | NOT NULL DEFAULT NOW() |
| `ip_address` | VARCHAR(45) | |

Index: `idx_contact_messages_submitted_at` on `submitted_at DESC`.

## See Also

- [Client Management API](client-management.md)
