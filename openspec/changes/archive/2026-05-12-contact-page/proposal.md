## Why

Public visitors have no working way to reach the firm from the website — `/contact` renders only a "Coming soon" placeholder. Replacing the stub with a real form (name / email / subject / message) plus the firm's address and an embedded map turns the page into the primary lead-capture channel. Persisting every submission to a `contact_messages` table and emailing the firm guarantees no inbound lead is lost even during SMTP incidents.

## What Changes

- **NEW** — `ContactComponent` (frontend) rewritten from a stub into a working page with a reactive form, a combined "Find Us" sidebar card (address / phone / email / hours + embedded Google Map iframe), Angular Material outlined fields, and a `mat-stroked-button` "Send Message" submit. Honeypot field `companyUrl` is rendered off-screen.
- **NEW** — `ContactService` (frontend, `core/services/contact.service.ts`) issues `POST /api/contact`.
- **NEW** — `POST /api/contact` REST endpoint accepting `{ name, email, subject, message, companyUrl }`. Returns `202 Accepted` on success, `400` on validation failure, `429` on rate-limit violation.
- **NEW** — `contact_messages` table (Flyway `V7__create_contact_messages.sql`) persisting every submission with `id`, `name`, `email`, `subject`, `message`, `submitted_at`, `ip_address`.
- **NEW** — `ContactService` (backend) orchestrates persist-then-email. SMTP failures are logged at WARN with the persisted row id; visitors still see success.
- **NEW** — `RateLimiter` enforces 5 submissions per IP per hour, fixed-window, in-memory (single-instance deployment).
- **NEW** — `MailProperties` `@ConfigurationProperties @Validated` class; `prod` profile fails to start if `SPRING_MAIL_HOST` / `SPRING_MAIL_USERNAME` / `SPRING_MAIL_PASSWORD` / `CONTACT_NOTIFICATION_EMAIL` are missing.
- **NEW** — Dev `LoggingMailSender` bean (`@Profile("dev")`) so local dev runs without a real SMTP server.
- **MODIFIED** — `SecurityConfig` adds `.requestMatchers(HttpMethod.POST, "/api/contact").permitAll()` BEFORE the existing `/api/**` authenticated rule. Without this change, every visitor submission gets 401.
- **NEW** — Playwright E2E test at `e2e/contact.spec.ts` covering the success path (form fill → submit → snackbar → DB row) and the inline-validation negative path.

## Capabilities

### New Capabilities

- `contact-page`: Public visitors can submit a contact form on `/contact`; submissions are persisted and emailed to the firm. The page also displays the firm's location (address + Google Map iframe) and contact details.

### Modified Capabilities

None. The contact form is a net-new public surface; no existing capability spec describes contact submissions.

## Non-Goals (Out of Scope)

- An admin UI for browsing or replying to messages (read the inbox or query `contact_messages` directly for now).
- File / attachment uploads on the form.
- Real-time chat or calendar booking.
- Internationalization of form labels.
- reCAPTCHA or other third-party anti-spam — explicitly rejected; honeypot + rate limit is the chosen posture.
- Google Maps JavaScript API or custom map styling — iframe embed only.
- Distributed/cross-instance rate limiting (in-memory map suffices for single-instance deployment; revisit if the app scales horizontally).
- An admin-configurable office address — values are hardcoded in `contact.component.html` for this change.

## Impact

- **Frontend:** new files under `src/app/features/contact/` (rewriting the existing stub), new `core/services/contact.service.ts`, new `core/models/contact-submission.ts`. Adds `MatSnackBarModule` usage to the contact page. No bundle-size impact beyond standard Angular Material primitives already used elsewhere.
- **Backend:** new package `com.gwhaitech.accountingfirm.contact` (web / dto / service / domain / repository / config sub-packages). New dependency on `spring-boot-starter-mail` (already a transitive of Spring Boot starter set — verify in `pom.xml`).
- **Database:** new `contact_messages` table via Flyway V7. Forward-compatible (additive).
- **Configuration:** new env vars consumed in prod — `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE`, `CONTACT_NOTIFICATION_EMAIL`, optional `CONTACT_FROM_EMAIL`. Dev profile uses the `LoggingMailSender` and requires none of these.
- **Security:** `SecurityConfig` gets one new public allowlist rule for `POST /api/contact`. CSRF remains disabled project-wide (rationale documented in design.md).
- **E2E:** one new Playwright spec at `e2e/contact.spec.ts`.
- **Rollback:** revert the frontend deploy; backend changes are backward-compatible (the `contact_messages` table can remain unused).
