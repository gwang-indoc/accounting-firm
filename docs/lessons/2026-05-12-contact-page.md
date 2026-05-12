# Lessons: Contact Page

**Archived:** 2026-05-12
**Change directory:** `openspec/changes/archive/2026-05-12-contact-page/`

## Scope vs. reality

- Design and proposal were fully implemented as specified — no scope drift.
- Office contact values (address, phone, email, hours) were left as placeholder text by design; updating them to real values was deferred as a separate non-code task.
- A premium UI redesign (`/frontend-design:frontend-design`) was applied post-completion as a follow-up request outside the original tasks.md — the original spec defined layout and fields but not visual aesthetic. Future UI changes should clarify expected polish level upfront.

## Recurring review findings

- `@WebMvcTest` slices require explicit `@MockBean` / `@Import` for every security/auth component the controller touches. Forgetting this caused compilation failures in the first review pass. This same pattern appeared in prior controller work — add a note in the spec or proposal when a new controller is introduced.

## TDD observations

- Several tasks went GREEN immediately on first run (no RED phase needed) because the implementation was straightforward and the test matched existing code contracts. The RED phase is still required — verify the test fails before implementing, even if you expect it to pass quickly. Skipping verification was flagged in the apply checklist.
- `MailPropertiesValidationTest` (verifying `@NotBlank` on `contact.notification-email`) was a useful pattern: write a test that confirms the validation annotation rejects a blank value, then confirm the property binding is wired. Reuse this pattern for any new `@ConfigurationProperties` class.

## Surprises / things to anticipate next time

- **`start.sh` had no `SPRING_PROFILES_ACTIVE` default.** Without `export SPRING_PROFILES_ACTIVE="${SPRING_PROFILES_ACTIVE:-dev}"`, no Spring profile was active, `@Profile("dev") LoggingMailSender` never loaded, and the app failed at startup with `JavaMailSender bean not found`. Always verify the startup script sets a default profile when adding `@Profile`-gated beans.
- **`CONTACT_NOTIFICATION_EMAIL` was missing from `.env`.** The property was added to `application.yml` but the corresponding env var was never added to `.env`, causing `@NotBlank` validation to fail on next startup. When adding a new required env var to `application.yml`, immediately add it to `.env` (and document it in the PR).
- **Material Icons font was completely absent from the project.** All `mat-icon` elements rendered as raw text until `<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">` was added to `index.html`. Any new Angular project bootstrapped without the Material Icons CDN link will have the same issue — check `index.html` before adding icon components.
- **E2E rate-limiter sensitivity.** The per-IP fixed-window rate limiter (5 requests/hour) blocks Playwright tests if the backend was used manually during the same window. Restarting the backend resets the counter. Consider a test-only override (e.g., `X-Test-Override` header or a longer window in dev profile) to avoid flaky E2E runs.
- **Gmail App Password is mandatory.** Regular Gmail passwords are rejected with `534 5.7.9` even with correct credentials. 2-Step Verification must be enabled first, then an App Password generated at myaccount.google.com. Document this in `.env.prod` comments and the deployment guide so it's not a surprise at prod deploy time.
