---
Date: 2026-06-08
Change: locale-switch-refactor
Status: REVIEWED
---

## Goals

- Ensure all pages/components render fully in both EN and Chinese (audit complete; i18n gaps fixed in this branch as part of the change).
- Persist language preference to the authenticated user's server-side profile so it follows them across devices and sessions.
- On login, apply the profile's stored language (if set); otherwise push the browser's localStorage value to the profile.
- On language switch while authenticated, write to both localStorage and the backend profile atomically from the frontend's perspective (fire-and-forget PATCH; no blocking UI).
- Anonymous users continue using localStorage only — no behaviour change.
- Form user-entered content is unaffected by locale switches (already true; document as a verified non-issue).

## Non-Goals

- Cookies for language storage (not needed; localStorage + user profile covers all cases).
- Blocking the UI while the PATCH request completes.
- Language detection from browser `Accept-Language` header.
- RTL support or locale-specific number/date formatting.
- Per-role or permission-based translation keys.

## Constraints

- Backend: Java 21, Spring Boot 3.5, Flyway migrations (latest V10). New migration must be V11.
- Frontend: Angular 21, zoneless, ngx-translate already wired. No Zone.js.
- `TranslationService` must not take a hard compile-time dependency on `AuthService` to avoid circular injection (both are `providedIn: 'root'`). Decouple via a callback/token or check `isAuthenticated` by reading the signal lazily.
- No new npm packages.
- `UserDto` changes propagate to both backend record and frontend interface.

## Success Criteria

1. Logged-in user sets language to `zh` → refreshes page on a different browser tab → sees `zh` (loaded from profile via `GET /api/auth/me`).
2. Anonymous user sets `zh` in localStorage → logs in → profile had `null` → profile is PATCH'd to `zh`; UI stays `zh`.
3. User has `en` in profile → logs in from a browser where localStorage says `zh` → profile wins; UI switches to `en`; localStorage updated to `en`.
4. User switches language mid-form (e.g. book-consultation) → form field values unchanged.
5. PATCH failure (network error) → UI language still switches; localStorage still updated; silent failure (no error toast).

## User Stories

- **As a returning authenticated user**, I want my language preference to persist across devices, so I don't have to re-select it each session.
- **As a new user logging in for the first time**, I want my browser language preference to carry over to my profile automatically.
- **As any user filling out a form**, I want switching languages mid-form to not wipe my typed content.

## Open Questions

- None remaining. All design decisions resolved in exploration.

## Referenced Capabilities

- `TranslationService` — `src/app/core/services/translation.service.ts`
- `AuthService.loadCurrentUser()` — `src/app/core/services/auth.service.ts`
- `UserDto` — backend `common/dto/UserDto.java`, frontend `core/models/user.model.ts`
- `User` entity — `auth/domain/User.java`
- `AuthController` — `auth/controller/AuthController.java` (`GET /api/auth/me`)
- Flyway migrations — `src/main/resources/db/migration/` (latest: V10)

## Implementation Sketch

### Backend

**V11 migration** — add `language` column:
```sql
ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT NULL;
```

**`User` entity** — add `language` field (`String`, nullable).

**`UserDto`** — add `language` field: `public record UserDto(Long id, String email, String name, String role, String language) {}`

**`AuthController`** — add `PATCH /api/auth/me/language`:
```
{ "language": "en" | "zh" }
→ updates users.language for the authenticated principal
→ returns 204 No Content
```

### Frontend

**`UserDto` interface** — add `language?: 'en' | 'zh'`.

**`TranslationService.setLanguage()`** — after existing logic, if user is authenticated, fire `PATCH /api/auth/me/language` (fire-and-forget; catch and ignore errors).

**`AuthService.loadCurrentUser()`** — after setting `currentUser` signal, call `translationService.applyProfileLanguage(user.language)`.

**`TranslationService.applyProfileLanguage(lang)`** — new method:
- If `lang` is non-null: apply it + overwrite localStorage.
- If `lang` is null: read localStorage, call `setLanguage(localStorage value)` to push it to profile.

**Circular dependency mitigation** — inject `HttpClient` directly into `TranslationService` for the PATCH call (it already has it). For reading auth state, pass the language value in from `AuthService` rather than having `TranslationService` import `AuthService`.
