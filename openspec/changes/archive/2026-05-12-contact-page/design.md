# Design: Contact Page

**Date:** 2026-05-11
**Status:** Draft — produced via /opsx:explore

## Context

The `/contact` route exists in `src/app/app.routes.ts` and a stub `ContactComponent` lives at `src/app/features/contact/`, but it currently renders only a "Coming soon" placeholder. The app has no contact-submission endpoint and no `contact_messages` storage.

This change fills in the contact page: a working submission form, static firm contact info, and a Google Map showing the office location. Submissions are both persisted to the database (so messages are never lost) and sent as an email notification (so the firm responds quickly).

**Stakeholders:**
- Public visitors (form submitters)
- Firm partners / admin (recipients of contact emails; also need access to persisted history for backfill or audit)
- Operations (configures SMTP credentials and notification inbox)

**Existing patterns to follow:**
- Standalone Angular components, Angular Material (`MatCard`, `MatFormField`, `MatInput`, `MatButton`), reactive forms with `FormBuilder` + `Validators`, signals for local UI state.
- Spring Boot layered architecture (`controller → service → repository`), Flyway migrations, Bean Validation at REST boundaries, secrets via env vars.

## Goals / Non-Goals

**Goals:**
- Visitors can submit name / email / subject / message and receive a clear success or error state.
- Every submission is persisted to a new `contact_messages` table.
- Every successful persistence triggers a notification email to a configured firm inbox.
- An iframe-embedded Google Map shows the office location alongside the firm's address, phone, email, and business hours.
- The form is protected against the bulk of automated spam by a hidden honeypot field and per-IP rate limiting on the server.

**Non-Goals:**
- An admin UI for browsing or replying to messages (a future change can add `/portal/admin/messages`; for now, partners read the email or query the table directly).
- File / attachment uploads on the form.
- Real-time chat or calendar booking.
- Internationalization of form labels (the rest of the app is English-first; a separate i18n change can localize).
- reCAPTCHA or other third-party anti-spam — explicitly rejected in favor of honeypot + rate limit.
- Google Maps JavaScript API or custom map styling — iframe embed only.

## Approach

### High level

```
              ┌────────────────────────────────────────────┐
              │ /contact (Angular page)                    │
              │                                            │
              │  ┌─────────────────────────┐ ┌──────────┐ │
              │  │ Reactive form           │ │ Find Us  │ │
              │  │  - name                 │ │  addr    │ │
              │  │  - email                │ │  phone   │ │
              │  │  - subject              │ │  email   │ │
              │  │  - message              │ │  hours   │ │
              │  │  - honeypot (hidden)    │ │ ───────  │ │
              │  │  [Send Message]         │ │  Google  │ │
              │  │   (stroked, not raised) │ │  Map     │ │
              │  └─────────────────────────┘ │  iframe  │ │
              │                              └──────────┘ │
              └──────────────┬─────────────────────────────┘
                             │ POST /api/contact (JSON, no auth)
                             ▼
              ┌────────────────────────────────────────────┐
              │ SecurityConfig                             │
              │   - permitAll on POST /api/contact         │
              │     (else /api/** rule blocks visitors)    │
              │   - CSRF disabled (unauthenticated)        │
              └──────────────┬─────────────────────────────┘
                             ▼
              ┌────────────────────────────────────────────┐
              │ ContactController                          │
              │   - @Valid ContactSubmissionRequest        │
              │   - reject if honeypot non-empty (200 OK)  │
              │   - rate-limit by client IP                │
              │     (5/hour, in-memory fixed window)       │
              └──────────────┬─────────────────────────────┘
                             ▼
              ┌────────────────────────────────────────────┐
              │ ContactService                             │
              │   1. save ContactMessage entity            │
              │   2. send notification email (Spring Mail) │
              │      - failure logged, NOT propagated      │
              │ ContactMessageRepository (JPA)             │
              └──────────────┬─────────────────────────────┘
                             ▼
              ┌────────────────────────────────────────────┐
              │ PostgreSQL                                 │
              │   contact_messages (id, name, email,       │
              │                     subject, message,      │
              │                     submitted_at, ip)      │
              └────────────────────────────────────────────┘

              ┌────────────────────────────────────────────┐
              │ SMTP (env-configured)                      │
              │   Sends "[Contact] {subject}" to           │
              │   CONTACT_NOTIFICATION_EMAIL inbox         │
              └────────────────────────────────────────────┘
```

### Frontend component breakdown

- **`ContactComponent`** (existing stub, rewritten):
  - `imports[]`: `ReactiveFormsModule`, `MatCard`, `MatCardHeader`, `MatCardTitle`, `MatCardContent`, `MatFormField`, `MatLabel`, `MatInput`, `MatButton`, `MatSnackBarModule`. (`MatSnackBar` itself is a service, injected via constructor — not listed in `imports[]`.)
  - `form: FormGroup` built in constructor with controls `name`, `email`, `subject`, `message`, `companyUrl` (honeypot — see Decisions for naming rationale).
  - Validators: `name` required, `email` required + `Validators.email`, `subject` required + max 200, `message` required + max 5000.
  - `submitting = signal(false)` for the only piece of UI state needed (disables the Send button and shows a spinner). Error feedback flows through `MatSnackBar` only — no separate `submitError` signal.
  - `submit()` calls `ContactService.send(...)`, on success shows `MatSnackBar` "Thanks — we'll reply soon" and resets the form; on error shows snackbar with retry hint.
  - The Send button uses `mat-stroked-button color="primary"` (outlined accent, not solid raised) — softer visual weight per the Visual Companion polish review.
  - Template renders two blocks per the chosen layout: the form card on the left (~2/3), and a single combined **"Find Us"** card on the right (~1/3) containing the four info rows on top and the Google Map iframe embedded below them. On mobile both cards stack vertically.
- **`ContactService`** (new, `src/app/core/services/contact.service.ts`):
  - One method: `send(payload: ContactSubmission): Observable<void>` → POST `/api/contact`.
- **DTO model** (new, `src/app/core/models/contact-submission.ts`):
  - `ContactSubmission { name; email; subject; message; companyUrl }` — `companyUrl` is the honeypot.

### Backend module breakdown

New package: `com.gwhaitech.accountingfirm.contact`.

- **`contact/web/ContactController`** — `@RestController @RequestMapping("/api/contact")`. POST endpoint accepting `@Valid @RequestBody ContactSubmissionRequest`, returning `202 Accepted` on success, `429 Too Many Requests` on rate-limit violation, `400` on validation failure.
- **`contact/dto/ContactSubmissionRequest`** — record with `@NotBlank` name, `@NotBlank @Email` email, `@NotBlank @Size(max=200)` subject, `@NotBlank @Size(max=5000)` message, `String companyUrl` (honeypot, no validation — see Decisions for naming rationale).
- **`contact/service/ContactService`** — orchestrates save + email. Catches `MailException` from the email step, logs it at WARN with the persisted `contact_messages.id`, but returns success (the message is already persisted; we don't want to surface SMTP outages to visitors).
- **`contact/service/RateLimiter`** — simple in-memory `ConcurrentHashMap<String, AtomicInteger>` keyed by client IP, with a `@Scheduled(fixedRate = 1 hour)` method that clears the map. **Fixed-window** semantics (acceptable for spam mitigation — a user submitting at 12:59 and 13:01 effectively gets two windows). Limit: 5 submissions per IP per hour. (Future change can swap in Bucket4j or Redis.)
- **`contact/service/ClientIpResolver`** — utility that extracts the client IP. **Policy: use `HttpServletRequest.getRemoteAddr()` only.** Do NOT trust `X-Forwarded-For` — there is no reverse proxy in the current deployment, and trusting that header blindly lets attackers spoof their IP to bypass rate limiting. When a proxy is added later, switch to Spring's `ForwardedHeaderFilter` with a configurable trusted-proxy allowlist.
- **`contact/domain/ContactMessage`** — JPA entity mapping the new table.
- **`contact/repository/ContactMessageRepository`** — `JpaRepository<ContactMessage, Long>`.
- **`contact/config/MailProperties`** — `@ConfigurationProperties("spring.mail") @Validated` record with `@NotBlank host`, `@NotBlank username`, etc. Plus a top-level `@NotBlank contact.notification.email` property. Spring fails to start in the `prod` profile if any required value is missing — this is the actual fail-fast mechanism (NOT a YAML-level check, which doesn't exist).
- **Email** — `JavaMailSender` is auto-configured by `spring-boot-starter-mail` once the SMTP env vars are set; the service constructs a `SimpleMailMessage` and calls `send`. `from` defaults to `SPRING_MAIL_USERNAME`; an optional `CONTACT_FROM_EMAIL` env var overrides it if the firm wants a different display address. Non-ASCII characters in the subject are MIME-encoded automatically by the framework.
- **SecurityConfig modification** — `backend/.../config/SecurityConfig.java` currently declares `.requestMatchers("/api/**").authenticated()`. Add `POST /api/contact` to the public allowlist: `.requestMatchers(HttpMethod.POST, "/api/contact").permitAll()` placed BEFORE the `/api/**` rule. Without this change, every visitor submission gets 401.

### Database

Flyway migration `V7__create_contact_messages.sql` (existing migrations go up to V6):

```sql
CREATE TABLE contact_messages (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(200)  NOT NULL,
    email         VARCHAR(254)  NOT NULL,
    subject       VARCHAR(200)  NOT NULL,
    message       TEXT          NOT NULL,
    submitted_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    ip_address    VARCHAR(45)   -- IPv6 max length
);

CREATE INDEX idx_contact_messages_submitted_at
    ON contact_messages (submitted_at DESC);
```

### Configuration

Two new sets of env-driven values:

1. **SMTP credentials** (consumed by Spring Mail auto-config):
   - `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD`, `SPRING_MAIL_PROPERTIES_MAIL_SMTP_STARTTLS_ENABLE`.
2. **Notification destination**:
   - `CONTACT_NOTIFICATION_EMAIL` — the inbox that receives "[Contact] {subject}" notifications.

**Dev mail behavior:** `application-dev.yml` defines a `dev` Spring profile with a custom `LoggingMailSender` bean (a tiny `JavaMailSender` implementation that logs the message and discards it). This bean is conditional on `@Profile("dev")` so production uses the real auto-configured sender. Local devs do not need a real SMTP server, and the existing dev mail flow can be verified by reading logs.

**Prod validation:** `application-prod.yml` requires all five SMTP env vars + `CONTACT_NOTIFICATION_EMAIL`. The actual fail-fast happens in the `MailProperties` `@ConfigurationProperties` class (see Backend module breakdown) — Spring will refuse to start if validation fails.

Office address, phone, and hours are **hardcoded** in `contact.component.html` for this change. The Google Map iframe URL is also hardcoded (a Google Maps "Embed a map" iframe `src` pointed at the office address). Externalizing these to config is left as a future change if/when the firm needs to edit them without a deploy.

## Decisions

### Decision: Submit target — DB + email (both)

**Choice:** Persist every submission to a new `contact_messages` table, then send a notification email.

**Alternatives considered:**
- DB only: simpler, but the firm has no inbound notification — messages could sit unread for days.
- Email only: no persistence, lighter footprint, but a single SMTP outage loses customer leads with no recovery.
- Frontend-only stub: trivial to implement but doesn't actually deliver the feature; would have to be redone.

**Rationale:** A small accounting firm's contact form is a lead-capture channel — losing a message costs real money. Persisting first guarantees durability; emailing second gives the firm real-time awareness. If SMTP fails, the message is still in the DB and the partner can review it later.

### Decision: Map rendering — Google "Embed a map" iframe

**Choice:** Standard Google Maps iframe embed (no API key, no JS).

**Alternatives considered:**
- Google Maps JavaScript API: full interactivity (custom pins, info windows), but requires a Google Cloud project, an API key, and a billing account. Adds ~25 KB JS to the bundle.
- Static Maps API: PNG image, also requires an API key, no pan/zoom.
- OpenStreetMap + Leaflet: no Google billing, ~40 KB JS, but visitors expect Google Maps' familiar UI in a US-market accounting firm.

**Rationale:** The iframe satisfies the "show where the office is" requirement with zero infrastructure and zero recurring cost. Pan and zoom work out of the box. Customers do not need to click pins or get directions inside the page (they can do that on Google Maps proper). This decision can be revisited if interactivity is later required.

### Decision: Anti-spam — honeypot + per-IP rate limit

**Choice:** Hidden `companyUrl` form field that bots fill in (reject submissions where it's non-empty), plus a server-side 5-submissions-per-IP-per-hour fixed-window rate limiter.

**Alternatives considered:**
- reCAPTCHA v3: highest detection rate, but adds a Google JS dependency, latency, and a privacy concern (Google receives every visitor's data). Also requires a key + secret in env.
- Honeypot only: blocks naïve bots but a determined attacker can bypass and there is no ceiling on volume.
- No protection: a public contact form attracts spam within hours.

**Rationale:** Honeypot stops the vast majority of automated form-fillers with zero UX friction (legitimate users never see the field). Rate limit caps the blast radius if a sophisticated bot bypasses the honeypot. Both run server-side; nothing leaks to a third party. If abuse persists, a follow-up change can layer reCAPTCHA on top.

**Honeypot field name — `companyUrl`, not `website`:** Many browser autofill heuristics will populate a field named `website` (especially if the user has saved a URL value in their profile), which would cause false-positive spam rejections for legitimate users. `companyUrl` is uncommon enough that no major autofill targets it. Also avoid `email`, `phone`, `name`, etc.

### Decision: CSRF posture for `/api/contact`

**Choice:** The endpoint inherits the project-wide `csrf().disable()` policy and adds nothing more.

**Rationale:** The existing rationale in `SecurityConfig` ("stateless JWT + SameSite=Strict cookie") only applies to authenticated endpoints. `/api/contact` is unauthenticated — there is no session or cookie state for an attacker to forge against. The worst a CSRF attack can do is cause an unaware visitor's browser to submit one extra contact message, which the per-IP rate limiter caps. CSRF tokens would add friction without meaningful protection.

### Decision: Page layout — form main, combined "Find Us" card sidebar

**Choice:** Two-column on desktop — form takes ~2/3 of the width on the left, and a single combined **"Find Us"** card occupies the ~1/3 sidebar on the right. The Find Us card contains the four info rows (address, phone, email, hours) on top with the Google Map iframe embedded directly below them, all inside one `mat-card`. On mobile, the columns collapse to a single stacked column: form → Find Us card.

The Send button uses `mat-stroked-button` (outlined accent) rather than `mat-raised-button` for a softer visual weight.

**Alternatives considered:**
- **Two separate cards** (info card stacked above a separate map card): the original sketch. Reviewed via Visual Companion as Resolution 1; rejected because it fragments the sidebar visually with two card edges and two elevations doing the work of one.
- **Full-width map below the form/info row** (Visual Companion Resolution 3): largest map presence, but pushes the map below the fold for short screens and emphasizes location over the form's primary action.
- Form left, info+map right 50/50: map gets equal visual weight to the form.
- Info top, form left + map right: info as a header strip — wastes vertical space above the fold.
- Stacked single-column: simplest responsive, but desktop layout looks sparse.

**Rationale:** The form is the primary action; giving it the larger column emphasizes "send us a message" while keeping address / phone / hours / map within glance range. Combining info + map into one card removes visual fragmentation and gives the map more vertical room than it had as a separate card without stealing the form's prominence. The stroked Send button matches the lighter, "informational" tone the rest of the page conveys — a raised button telegraphed more urgency than the page warranted. Choice confirmed via Visual Companion (Resolution 2).

### Decision: Email-failure handling — log, don't propagate

**Choice:** If `JavaMailSender.send(...)` throws `MailException`, log it at WARN level with the persisted `contact_messages.id` (so ops can correlate the unsent message to a DB row) and still return success to the client. The message is already in the DB.

**Alternatives considered:**
- Surface email failure to the visitor: visitors don't care whether the firm's SMTP works; they only want to know their message was received.
- Roll back the DB write: would lose the lead.
- Retry the email: out of scope for this change; a future job-queue change can pick up unsent rows.

**Rationale:** The DB write is the contract with the visitor; the email is an internal notification. Decoupling them keeps the UX correct even during SMTP incidents. The WARN log gives ops visibility.

## Risks / Trade-offs

- **In-memory rate limit doesn't survive restarts and doesn't work across multiple backend instances.** → Mitigation: acceptable for a single-instance deployment. If the app scales horizontally, swap in Bucket4j-Redis or move to a sticky-session deployment. Documented as a known limitation.
- **Iframe embed is not directly customizable** (no custom pin style, no info window). → Mitigation: the firm's address text adjacent to the iframe gives the same information; if richer interactions are needed, upgrade to the JS API in a later change.
- **SMTP credentials in env vars must be set in prod.** A missed deploy step would silently drop notification emails. → Mitigation: `MailProperties` `@ConfigurationProperties @Validated` class enforces presence at startup; Spring fails to boot the `prod` profile if any required value is missing.
- **Honeypot can be bypassed by a hand-crafted bot.** → Mitigation: rate limit caps the damage; a future reCAPTCHA layer remains an option.
- **Persisted messages may contain PII.** → Mitigation: the `contact_messages` table is protected by the same DB credentials as the rest of the app; no row-level access. A future GDPR/retention policy (e.g., auto-delete after 2 years) is out of scope.

## Testing

Per CLAUDE.md's TDD discipline and the schema's `tasks.instruction`, every behavior gets a RED test before a GREEN implementation. Test coverage breaks down as follows:

**Backend (`backend/src/test/java/...`):**
- `ContactControllerTest` (`@WebMvcTest`): valid POST returns 202; invalid email returns 400; missing required fields return 400 with field-level errors; honeypot-filled returns 200 (silent reject — don't tip off bots); rate-limit exceeded returns 429.
- `ContactServiceTest` (plain unit, mocked `JavaMailSender` + repo): happy path persists then sends; `MailException` from sender is swallowed and logged with the persisted row id; service still returns success to the caller.
- `RateLimiterTest` (unit): first 5 calls from same IP pass, 6th throws/returns false; cleanup task resets counters; different IPs have independent buckets.
- `ContactMessageRepositoryTest` (`@DataJpaTest` against local PostgreSQL, no Testcontainers per CLAUDE.md): save round-trips all columns; `submitted_at` is populated with a default if not set.
- `MailPropertiesValidationTest` (`@SpringBootTest` with `prod` profile + missing env): asserts startup failure on missing required values.

**Frontend (`frontend/src/app/features/contact/...`):**
- `ContactComponent` spec (Vitest + Angular TestBed): form is invalid when any required field is empty; `submit()` is a no-op when invalid; valid submit calls `ContactService.send` and disables the Send button while `submitting()` is true; snackbar is shown on both success and error paths.
- `ContactService` spec: `send()` issues a POST to `/api/contact` with the expected JSON body.

**E2E (`e2e/contact.spec.ts`, Playwright — required per CLAUDE.md for any UI flow):**
- Navigate to `/contact`, assert form, info card, and map iframe are visible.
- Fill the form, submit, assert the success snackbar text.
- Assert a new row appears in `contact_messages` (via a backend test helper or a direct DB query in the test).
- Negative path: submit with an invalid email, assert the form shows the inline error and no POST is sent.

## Migration Plan

1. Apply Flyway migration in dev → verify table exists with expected columns.
2. Configure SMTP env vars in the dev environment (or rely on the no-op logging profile).
3. Deploy backend; run a manual smoke submission and confirm both DB row and email arrive.
4. Deploy frontend; navigate to `/contact`, submit a test message, confirm snackbar and a fresh DB row.
5. Set `CONTACT_NOTIFICATION_EMAIL` in prod env. Roll back path: revert frontend deploy; backend migration is forward-compatible (the table can stay).

## UI

Selected layout (Visual Companion Resolution 2, confirmed by user). See `## Decisions → Page layout` for rationale and rejected alternatives.

```
Desktop (≥900px):
+--------------------------------------------------------+
| Contact Us                                             |
+--------------------------------+-----------------------+
| Form card (~2/3 width)         | Find Us card (~1/3)   |
|  Name                          |  Address              |
|  Email                         |  Phone                |
|  Subject                       |  Email                |
|  Message                       |  Hours                |
|  [Send Message]                |  ───────────────────  |
|   (mat-stroked-button)         |  [Google Map iframe]  |
|                                |  (fills remaining     |
|                                |   vertical space)     |
+--------------------------------+-----------------------+

Mobile (<900px, stacks):
+----------------------------------+
| Contact Us                       |
+----------------------------------+
| Form card                        |
|  Name / Email / Subject /        |
|  Message / [Send Message]        |
+----------------------------------+
| Find Us card                     |
|  Address / Phone / Email / Hours |
|  ──────────────────────────────  |
|  [Google Map iframe]             |
+----------------------------------+
```

Components:
- **Two outer `mat-card`s** total: the form card and the combined "Find Us" card. Both at the same elevation as the rest of the site's cards.
- Inside the Find Us card: a `mat-card-header` with `mat-card-title` "Find Us", a `mat-card-content` listing the four info rows, then the Google Maps iframe directly below (no extra wrapper card around the iframe).
- Form uses Angular Material outlined form fields (`appearance="outline"`).
- Send button is `<button mat-stroked-button color="primary">` — outlined accent, not solid raised.
- Honeypot field rendered with `style="position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden"` and `tabindex="-1" aria-hidden="true"` so it doesn't reach screen readers or keyboard users.
- `MatSnackBar` for success/error feedback (3-second auto-dismiss, "OK" action on error).
- **Visual Companion artifact:** the mockups that informed this layout are at `.superpowers/brainstorm/87069-1778547217/content/contact-layout.html` and `polish-resolutions.html` (gitignored project-local files).

## Open Questions

These are data values needed at /opsx:propose time but they do not change the design:

- **Office address, phone, email, hours** — exact values to hardcode in `contact.component.html`.
- **Google Maps iframe `src`** — generated from Google Maps' "Share → Embed a map" copy box once the address is known.
- **SMTP provider** — which provider does the firm use (Gmail SMTP, SendGrid, Mailgun, internal relay)? Affects env-var values, not code.
- **Validation cap on `message`** — design picks 5000 chars; confirm or tighten before tasks.md is generated.
