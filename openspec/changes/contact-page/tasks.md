# Tasks: contact-page

> Apply-time discipline (TDD RED/GREEN, checkbox flips, dev log, code review checkpoints) is enforced by the openspec-superpowers schema's `apply.instruction`. Read it via `openspec instructions apply --change contact-page --json` before starting Task 1.
>
> Before starting each `## N` group, run the full test suite to confirm a green baseline (`cd backend && ./mvnw test`; `cd frontend && npx ng test --no-watch`). A failing baseline must be fixed before new work begins.

## 1. Persistence layer (Flyway migration, entity, repository)

- [x] 1.1 RED — write `ContactMessageRepositoryTest` (`@DataJpaTest`, no Testcontainers per CLAUDE.md, `@AutoConfigureTestDatabase(replace=NONE)` against local PostgreSQL at `localhost:5432`) that saves a `ContactMessage` with name/email/subject/message and asserts the round-tripped entity matches and `submittedAt` is non-null. Run it, paste the FAILURE output (no compile / no class found) to `docs/log/YYYY-MM-DD.md` as TDD evidence.
- [x] 1.2 GREEN — add `backend/src/main/resources/db/migration/V7__create_contact_messages.sql` exactly as specified in design.md (`id BIGSERIAL PK`, `name VARCHAR(200) NOT NULL`, `email VARCHAR(254) NOT NULL`, `subject VARCHAR(200) NOT NULL`, `message TEXT NOT NULL`, `submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `ip_address VARCHAR(45)`, plus `idx_contact_messages_submitted_at` on `submitted_at DESC`). Create `com.gwhaitech.accountingfirm.contact.domain.ContactMessage` (JPA entity, `@Entity @Table(name="contact_messages")`, `@Id @GeneratedValue` Long, fields matching columns, `@CreationTimestamp` on `submittedAt`). Create `com.gwhaitech.accountingfirm.contact.repository.ContactMessageRepository extends JpaRepository<ContactMessage, Long>`. Run repository test → PASS. Commit migration + entity + repository + test together.
- [x] 1.3 RED — extend repository test with a `findAll(Sort.by("submittedAt").descending())` case verifying the index-friendly ordering returns rows newest-first. Paste the FAILURE.
- [x] 1.4 GREEN — confirm the entity + index suffice (no code change needed; the test should pass once the migration index is in place). Re-run the suite. If PASS, commit any test-only addition.
- [x] 1.Z Run `superpowers:requesting-code-review` on the diff for group 1; address CRITICAL/HIGH findings before moving on.
- [x] 1.Z+1 Update `docs/log/YYYY-MM-DD.md` — commit hash, feature bullets, code review findings, test count, and TDD evidence (paste RED failure lines from 1.1 and 1.3).

## 2. Mail configuration (starter dependency, properties validation, dev sender)

- [x] 2.1 GREEN — add `<dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-mail</artifactId></dependency>` to `backend/pom.xml`. Run `./mvnw clean compile` → success. Commit.
- [x] 2.2 RED — write `MailPropertiesValidationTest` (`@SpringBootTest` with `@ActiveProfiles("prod")` and a `@DynamicPropertySource` that leaves `contact.notification.email` unset). Assert the context fails to start with an error message identifying the missing property. Paste the FAILURE.
- [x] 2.3 GREEN — create `com.gwhaitech.accountingfirm.contact.config.MailProperties` as a `@ConfigurationProperties("contact") @Validated` record with `@NotBlank` `notification.email` and any other contact-specific config. Register it via `@EnableConfigurationProperties(MailProperties.class)` on a `@Configuration` class. Run test → PASS. Commit.
- [x] 2.4 RED — write `LoggingMailSenderTest` (`@SpringBootTest`, `@ActiveProfiles("dev")`, no SMTP env vars). Assert that the active `JavaMailSender` bean is an instance of `LoggingMailSender`. Paste the FAILURE.
- [x] 2.5 GREEN — create `com.gwhaitech.accountingfirm.contact.config.LoggingMailSender` (a tiny `JavaMailSender` implementation that logs subject + recipient + body length at INFO and discards) annotated `@Component @Profile("dev")`. Verify Spring Mail auto-configuration is bypassed under the dev profile (or that `LoggingMailSender` is registered with `@Primary` under dev). Run test → PASS. Commit.
- [x] 2.Z Run `superpowers:requesting-code-review` on the diff for group 2; address CRITICAL/HIGH findings before moving on.
- [x] 2.Z+1 Update `docs/log/YYYY-MM-DD.md` — commit hash, feature bullets, review findings, test count, TDD evidence (paste RED failure lines from 2.2 and 2.4).

## 3. Domain service (ContactService + RateLimiter + ClientIpResolver)

- [x] 3.1 RED — write `RateLimiterTest` (plain unit, no Spring). Construct a `RateLimiter` with limit=5, window=1 hour. Call `tryAcquire("1.2.3.4")` 5 times — all return true. 6th call returns false. Different IP returns true. Paste the FAILURE.
- [x] 3.2 GREEN — create `com.gwhaitech.accountingfirm.contact.service.RateLimiter` using `ConcurrentHashMap<String, AtomicInteger>` keyed by IP. `tryAcquire(ip)` increments and compares to limit. Include a `@Scheduled(fixedRate = 3_600_000)` `reset()` that clears the map (fixed-window semantics). Annotate the class `@Component` and the `@Scheduled` config requires `@EnableScheduling` somewhere (add to a `@Configuration` class if not already present). Run test → PASS. Commit.
- [x] 3.3 RED — write `ClientIpResolverTest` (plain unit with mock `HttpServletRequest`). When `request.getRemoteAddr()` returns `"5.6.7.8"` and `request.getHeader("X-Forwarded-For")` returns `"1.1.1.1"`, the resolver MUST return `"5.6.7.8"` (NOT the spoofed XFF). Paste the FAILURE.
- [x] 3.4 GREEN — create `com.gwhaitech.accountingfirm.contact.service.ClientIpResolver` with a single static method `resolve(HttpServletRequest)` returning `request.getRemoteAddr()`. Add a Javadoc comment explaining the trust model (no proxy in current deployment; X-Forwarded-For ignored). Run test → PASS. Commit.
- [x] 3.5 RED — write `ContactServiceTest` (plain unit with mocked `ContactMessageRepository` and `JavaMailSender`). Happy path: `submit(request, ip)` calls `repository.save(...)` exactly once with an entity whose fields match the request, then calls `mailSender.send(...)` exactly once with a `SimpleMailMessage` whose subject is `"[Contact] " + request.subject()` and whose `to` matches the configured `CONTACT_NOTIFICATION_EMAIL`. Paste the FAILURE.
- [x] 3.6 GREEN — create `com.gwhaitech.accountingfirm.contact.service.ContactService.submit(ContactSubmissionRequest, String ip)`. Wire `ContactMessageRepository`, `JavaMailSender`, and `MailProperties` via constructor injection. Implement the persist-then-send sequence. Run test → PASS. Commit.
- [x] 3.7 RED — extend `ContactServiceTest`: when `mailSender.send(...)` throws `MailException`, the service MUST still return successfully (return the persisted entity or `void`), the row MUST remain in the repository, and a WARN log entry MUST be emitted containing the persisted row id. Paste the FAILURE.
- [x] 3.8 GREEN — wrap `mailSender.send(...)` in `try/catch (MailException)`, log at WARN with `LoggerFactory.getLogger(...).warn("Failed to send notification email for contact_messages.id={}", persisted.getId(), ex)`. Verify the test passes. Commit.
- [x] 3.9 RED — extend `ContactServiceTest` to verify the `from` address: default = `SPRING_MAIL_USERNAME`; with `CONTACT_FROM_EMAIL` set, the override is used. Paste the FAILURE.
- [x] 3.10 GREEN — wire `CONTACT_FROM_EMAIL` (optional) and `SPRING_MAIL_USERNAME` via `@Value` or `MailProperties`. Set `message.setFrom(...)` accordingly. Run test → PASS. Commit.
- [x] 3.Z Run `superpowers:requesting-code-review` on the diff for group 3; address CRITICAL/HIGH findings before moving on.
- [x] 3.Z+1 Update `docs/log/YYYY-MM-DD.md` — commit hash, feature bullets, review findings, test count, TDD evidence (paste RED failure lines from 3.1, 3.3, 3.5, 3.7, 3.9).

## 4. HTTP layer (DTO, controller, SecurityConfig)

- [x] 4.1 RED — write `ContactControllerTest` (`@WebMvcTest(ContactController.class)`, mock `ContactService` and `RateLimiter`). Valid JSON POST to `/api/contact` returns 202 and calls `service.submit(...)` exactly once. Paste the FAILURE.
- [x] 4.2 GREEN — create `com.gwhaitech.accountingfirm.contact.dto.ContactSubmissionRequest` as a `record(String name, String email, String subject, String message, String companyUrl)` with `@NotBlank` on name, `@NotBlank @Email` on email, `@NotBlank @Size(max=200)` on subject, `@NotBlank @Size(max=5000)` on message, no validation on `companyUrl`. Create `com.gwhaitech.accountingfirm.contact.web.ContactController` with `@RestController @RequestMapping("/api/contact")` and one method `@PostMapping ResponseEntity<Void> submit(@Valid @RequestBody ContactSubmissionRequest, HttpServletRequest req)` returning `ResponseEntity.accepted().build()`. Run test → PASS. Commit.
- [x] 4.3 RED — extend controller test: POST without auth returns 202 (not 401) AND `GET /api/contact` without auth returns 401. Run before changing SecurityConfig — expect: POST = 401 (FAILURE), GET = 401 (PASS). Paste the FAILURE.
- [x] 4.4 GREEN — modify `backend/src/main/java/com/gwhaitech/accountingfirm/config/SecurityConfig.java`: add `.requestMatchers(HttpMethod.POST, "/api/contact").permitAll()` BEFORE the existing `.requestMatchers("/api/**").authenticated()` rule. Re-run test → both cases PASS. Commit.
- [x] 4.5 RED — extend test: POST with missing `name` returns 400 and does NOT call `service.submit`. POST with invalid email returns 400. POST with subject longer than 200 chars returns 400. POST with message longer than 5000 chars returns 400. Paste the FAILURE.
- [x] 4.6 GREEN — confirm Bean Validation kicks in (likely already passes after 4.2; if not, ensure `GlobalExceptionHandler` returns 400 for `MethodArgumentNotValidException`). Verify a global `@RestControllerAdvice` exists or add one. Run tests → PASS. Commit.
- [x] 4.7 RED — extend test: POST with `companyUrl: "http://spam.example"` returns 200 (NOT 202) AND `service.submit` is NEVER called AND `rateLimiter.tryAcquire` is NEVER called. Paste the FAILURE.
- [x] 4.8 GREEN — in `ContactController.submit`, before calling the rate limiter or service, check `request.companyUrl()`. If non-empty, return `ResponseEntity.ok().build()` immediately. Run test → PASS. Commit.
- [x] 4.9 RED — extend test: when `rateLimiter.tryAcquire(ip)` returns false, the controller returns 429 and does NOT call `service.submit`. Paste the FAILURE.
- [x] 4.10 GREEN — in `ContactController.submit`, after the honeypot check but before calling the service, call `rateLimiter.tryAcquire(ClientIpResolver.resolve(req))`. If false, return `ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).build()`. Run test → PASS. Commit.
- [x] 4.11 Integration test (`@SpringBootTest` + `MockMvc`, dev profile): full happy path — POST valid body, expect 202, verify a row exists in `contact_messages`. Commit.
- [x] 4.Z Run `superpowers:requesting-code-review` on the diff for group 4; address CRITICAL/HIGH findings before moving on.
- [x] 4.Z+1 Update `docs/log/YYYY-MM-DD.md` — commit hash, feature bullets, review findings, test count, TDD evidence (paste RED failure lines from 4.1, 4.3, 4.5, 4.7, 4.9).

## 5. Frontend service and model

- [x] 5.1 RED — write `frontend/src/app/core/services/contact.service.spec.ts` (Vitest + Angular `TestBed` with `provideHttpClientTesting()`). Asserts `send(payload)` issues a single `POST /api/contact` with the JSON body matching the payload. Paste the FAILURE.
- [x] 5.2 GREEN — create `frontend/src/app/core/models/contact-submission.ts` exporting `interface ContactSubmission { name: string; email: string; subject: string; message: string; companyUrl: string; }`. Create `frontend/src/app/core/services/contact.service.ts` as a `@Injectable({ providedIn: 'root' })` with `send(payload: ContactSubmission): Observable<void>` calling `httpClient.post<void>('/api/contact', payload)`. Run test → PASS. Commit.
- [x] 5.Z Run `superpowers:requesting-code-review` on the diff for group 5; address CRITICAL/HIGH findings before moving on.
- [x] 5.Z+1 Update `docs/log/YYYY-MM-DD.md` — commit hash, feature bullets, review findings, test count, TDD evidence (paste RED failure lines from 5.1).

## 6. Frontend page component (FINAL group — touches UI)

- [x] 6.0 Ask the user (via the chat) for the literal values to hardcode into `contact.component.html` (and the Google Maps iframe `src` URL): office address, phone, email, business hours. Capture them inline below this checkbox before continuing. If the user defers, use the placeholder values `123 Main St, Anytown CA 90210 / (555) 123-4567 / info@firm.com / Mon–Fri 9–5` and a sample iframe `src` pointed at the placeholder address; flag a follow-up to replace before deploy.
- [x] 6.1 RED — write `contact.component.spec.ts` (Vitest + Angular `TestBed`): the rendered template MUST contain four `<mat-form-field>` instances labeled Name / Email / Subject / Message AND one `button[mat-stroked-button]` with text "Send Message". Paste the FAILURE.
- [x] 6.2 GREEN — rewrite `frontend/src/app/features/contact/contact.component.ts` and `.html` (and `.css`):
       - `imports[]`: `ReactiveFormsModule`, `MatCard`, `MatCardHeader`, `MatCardTitle`, `MatCardContent`, `MatFormField`, `MatLabel`, `MatInput`, `MatButton`, `MatSnackBarModule`.
       - Inject `FormBuilder`, `ContactService`, `MatSnackBar` via constructor.
       - `form: FormGroup` with controls `name`, `email`, `subject`, `message`, `companyUrl`.
       - Submit button: `<button mat-stroked-button color="primary" type="submit" [disabled]="form.invalid || submitting()">Send Message</button>`.
       - Run test → PASS. Commit.
- [x] 6.3 RED — extend spec: the form is invalid when Name is empty; the form is invalid when Email is "not-an-email"; the form is invalid when Message > 5000 chars; the Send button is disabled in every invalid case. Paste the FAILURE.
- [x] 6.4 GREEN — attach validators to controls: `name [required]`, `email [required, Validators.email]`, `subject [required, Validators.maxLength(200)]`, `message [required, Validators.maxLength(5000)]`. Run test → PASS. Commit.
- [x] 6.5 RED — extend spec: clicking Send with a valid form calls `ContactService.send` exactly once with the form value; the `submitting()` signal flips to `true` during the request; on success (mocked HTTP 202) the form is reset and a `MatSnackBar.open("Thanks — we'll reply soon", ..., { duration: 3000 })` is invoked. Paste the FAILURE.
- [x] 6.6 GREEN — implement `submit()` method: if `form.invalid` early return; set `submitting.set(true)`; subscribe to `contactService.send(form.value)`; on next: reset form, snackbar success; on error: snackbar error with "OK" action; on finalize: `submitting.set(false)`. Run test → PASS. Commit.
- [x] 6.7 RED — extend spec: on a failed submission the form values are NOT cleared AND an error `MatSnackBar` is opened with an action button. Paste the FAILURE.
- [x] 6.8 GREEN — verify error branch in submit() preserves values; adjust if needed. Run test → PASS. Commit.
- [x] 6.9 RED — extend spec: the rendered template contains an `<input>` element with `name="companyUrl"`, `tabindex="-1"`, `aria-hidden="true"`, AND the element MUST be visually hidden (off-screen via absolute positioning, NOT `display:none`). Paste the FAILURE.
- [x] 6.10 GREEN — add the honeypot input to the template within the form, with inline styles `position:absolute; left:-9999px; width:1px; height:1px; overflow:hidden;` and the required attributes. Bind it to the `companyUrl` form control. Run test → PASS. Commit.
- [x] 6.11 Implement the layout in `contact.component.html` + `.css`:
       - One outer container with CSS grid (or flex) splitting the page into form (~2/3) and "Find Us" card (~1/3) on viewports ≥ 900px, stacked single-column below 900px.
       - Form card: `mat-card` wrapping the reactive form.
       - Find Us card: `mat-card` containing four info rows (Address / Phone / Email / Hours) on top with the values from task 6.0, then a `<iframe>` element with the Google Maps `src` URL filling the remaining vertical space.
       - The `<iframe>` MUST set `loading="lazy"` and `referrerpolicy="no-referrer-when-downgrade"` per Google's embed recommendations.
       - No new unit test for the layout itself — it is covered by the Playwright E2E in task 6.J. Commit.
- [x] 6.12 Visual smoke test by running the dev server (`cd frontend && npm start`) and manually loading http://localhost:4200/contact — confirm form renders, layout is correct on desktop AND mobile (DevTools responsive mode at 360 px wide), Send button is the outlined stroked variant. Document any deviations in the dev log. Kill the dev server when done (`kill $(lsof -ti :4200)`).
- [x] 6.J Write `e2e/contact.spec.ts` (Playwright) covering the contact-page user flow. Include at minimum:
       - Happy path: navigate to `http://localhost:4200/contact`, fill name/email/subject/message, click Send Message, assert the success snackbar text is visible, then assert (via a `request.post('/api/admin/test/contact-messages/latest')` test helper OR a direct DB query through a small Java test endpoint enabled only in the test profile) that a row exists in `contact_messages` matching the submitted data.
       - Negative path: enter an invalid email, assert the inline email error is shown, assert no `POST /api/contact` network request is fired.
       Commit the spec file. Run the full flow:
       1. `./start.sh`                          # start backend
       2. `cd frontend && npm start`            # start frontend
       3. `cd e2e && npx playwright test`       # run E2E suite
       4. `kill $(lsof -ti :4200)`              # stop frontend
       5. `kill $(lsof -ti :8080)`              # stop backend
- [x] 6.K Run `superpowers:verification-before-completion`:
       - `cd backend && ./mvnw test` (all backend tests pass)
       - `cd frontend && npx ng test --no-watch` (all frontend tests pass)
       - `grep -rn 'System.out.println' backend/src/main/java` returns nothing
       - `grep -rn 'console\\.log' frontend/src/app` returns nothing (test files excepted)
       - Review `git diff main...new_approach -- backend/ frontend/ openspec/changes/contact-page/ e2e/` for any unintended changes
- [x] 6.Z Run `superpowers:requesting-code-review` on the diff for group 6; address CRITICAL/HIGH findings before moving on.
- [x] 6.Z+1 Update `docs/log/YYYY-MM-DD.md` — commit hash, feature bullets, review findings, test count, TDD evidence (paste RED failure lines from 6.1, 6.3, 6.5, 6.7, 6.9), and a one-line note recording the values used in task 6.0.
