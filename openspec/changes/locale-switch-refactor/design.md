## Context

Language preference is currently stored only in `localStorage`. This works for anonymous users and single-device authenticated users, but resets whenever someone logs in on a new device or browser. The existing `TranslationService` already reads/writes `localStorage` and calls `translate.use()`. The existing `AuthService.loadCurrentUser()` hits `GET /api/auth/me` and sets a signal — this is the right place to apply profile language after login. All i18n gaps (hardcoded EN strings in login, admin, portal pages) have already been fixed on this branch.

Circular dependency risk: `TranslationService` and `AuthService` are both `providedIn: 'root'`. Having either import the other would create a cycle. Decoupling is required.

## Goals / Non-Goals

**Goals:**
- Store `language` on the `users` table (nullable; `null` means no preference set).
- `GET /api/auth/me` returns `language` field so the frontend can apply it on login.
- `PATCH /api/auth/me/language` lets the frontend update language without a full profile edit endpoint.
- Profile wins over localStorage on conflict (consistent cross-device experience).
- NULL profile → push localStorage value to profile (graceful first-login handling).
- Language switch while authenticated fires a fire-and-forget PATCH (no blocking UI).

**Non-Goals:**
- Server-side locale detection (`Accept-Language` header).
- Blocking the UI while the PATCH completes.
- Cookie-based storage.
- RTL or locale-specific number/date formatting.

## Decisions

### Decision 1 — Decouple TranslationService from AuthService via method parameter

**Choice:** `AuthService.loadCurrentUser()` calls `translationService.applyProfileLanguage(user.language)` after setting the user signal. `TranslationService` does NOT import `AuthService`.

**Why:** Avoids circular DI. `AuthService` already holds the user signal; it naturally orchestrates post-login side effects. `TranslationService` only needs the language string, not the full user object.

**Alternative considered:** Inject `AuthService` into `TranslationService` lazily (using `inject()` at call time). Rejected — still creates a module-level cycle that Angular's DI detects at runtime.

### Decision 2 — Fire-and-forget PATCH, silent fail

**Choice:** `TranslationService.setLanguage()` calls `this.http.post(PATCH_URL, {language}).pipe(catchError(() => EMPTY)).subscribe()` when authenticated. No retry, no toast.

**Why:** Language preference is low-stakes. A network failure should not block the locale switch, which is immediately visible and already persisted to localStorage. The profile will sync on the next successful switch.

**Alternative considered:** Queued retry with exponential backoff. Rejected — overengineered for this use case; the profile will be correct at next login anyway.

### Decision 3 — `TranslationService.setLanguage()` checks auth state by reading AuthService signal lazily

**Choice:** `TranslationService` receives `AuthService` as a constructor dependency but only reads `authService.isAuthenticated()` signal at call time (no subscription, no lifecycle hook). The DI graph is: `AuthService` → `TranslationService` (one-way).

**Wait** — this creates a cycle (`AuthService` calls `translationService.applyProfileLanguage`, meaning `AuthService` → `TranslationService`; and `TranslationService` → `AuthService`). Correction:

**Revised choice:** `TranslationService` does NOT inject `AuthService`. Instead, `AuthService.loadCurrentUser()` passes `user.language` into `translationService.applyProfileLanguage(lang)`. For the "should I PATCH?" check in `setLanguage()`, `AuthService` registers a callback or `TranslationService` accepts an `isAuthenticated` function at init time via `init(isAuthFn)`.

**Simplest implementation:** `TranslationService.init()` already runs at app startup via `APP_INITIALIZER`. Add a second step: `authService.onUserChange(user => translationService.applyProfileLanguage(user?.language ?? null))` using Angular's `effect()` in `AuthService`'s constructor. For the PATCH guard, pass `() => authService.isAuthenticated()` into `TranslationService.init()` as a `isAuthFn` parameter.

### Decision 4 — Flyway V11, single nullable column

**Choice:** `ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT NULL;`

**Why:** Nullable avoids any default-value ambiguity (null = no preference, not "English"). `VARCHAR(10)` fits `'en'` and `'zh'`; leaves room for future locales.

**Alternative considered:** Separate `user_preferences` table. Rejected — over-normalized for a single lightweight field; the `users` table already holds UI-facing state (name, role).

## Risks / Trade-offs

- **[Race on rapid language switches]** → User toggles EN→ZH→EN quickly; two PATCHes in flight with undefined order. Mitigation: Fire-and-forget is acceptable; last write wins. No de-duplication needed for this use case.
- **[Profile language null after migration]** → All existing users have `language = null`. First login after deploy: localStorage wins and is pushed to profile. No data migration needed.
- **[Stale localStorage after profile update from another device]** → localStorage lags until next `loadCurrentUser()` call. Mitigation: Profile is applied on every login. Acceptable for a non-critical preference.
- **[Angular DI cycle]** → Managed by passing `isAuthFn` callback into `TranslationService.init()` rather than injecting `AuthService` directly. Must be verified with `ng build` (compile-time DI cycle check).

## Migration Plan

1. Deploy backend with V11 migration applied (Flyway runs automatically on startup).
2. All existing users get `language = null` — handled gracefully by frontend (localStorage push).
3. No rollback data migration needed: removing the column restores prior state (column is nullable, default null).
4. Frontend changes are backwards-compatible: `UserDto.language` is optional (`language?: 'en' | 'zh'`); `applyProfileLanguage(null)` falls back to localStorage.

## Open Questions

None. All decisions resolved.
