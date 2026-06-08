# Tasks — locale-switch-refactor

## 1. Backend: language column + UserDto + PATCH endpoint

### Contract
- **Spec**: "The system SHALL store the authenticated user's language preference (`'en'` or `'zh'`) in the `users.language` column (nullable VARCHAR(10))." / "The `GET /api/auth/me` endpoint SHALL include the `language` field in its `UserDto` response." / "A `PATCH /api/auth/me/language` endpoint SHALL accept `{"language": "en" | "zh"}` and update the column for the authenticated principal, returning 204 No Content." / "WHEN an unauthenticated request is made to `PATCH /api/auth/me/language` THEN the server responds with 401 Unauthorized."
- **Runtime**: `cd backend && ./mvnw test -Dtest=AuthControllerTest` → all PATCH /api/auth/me/language tests pass (authenticated update → 204, unauthenticated → 401, GET /api/auth/me includes language field)
- **Code**: V11 migration uses `ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT NULL;` — nullable, no backfill. `UserDto` is a Java record: add `language` as last field. PATCH endpoint uses `@AuthenticationPrincipal User user` — same pattern as existing `/me`. No separate repository method needed: use existing `UserRepository.save()`.
- **Threshold**: 80

- [ ] 1.0 CONTRACT — write openspec/changes/locale-switch-refactor/contracts/group-1.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [ ] 1.1 RED — write failing test in `AuthControllerTest`: `PATCH /api/auth/me/language` with valid auth returns 204 and persists language
- [ ] 1.2 GREEN — create `V11__add_language_to_users.sql`; add `language` field to `User` entity; update `UserDto` record; add `PATCH /api/auth/me/language` handler in `AuthController`
- [ ] 1.3 RED — write failing test: `PATCH /api/auth/me/language` without auth returns 401
- [ ] 1.4 GREEN — verify Spring Security config protects the endpoint (should inherit existing pattern; no change needed if already protected)
- [ ] 1.5 RED — write failing test: `GET /api/auth/me` returns `language` field in JSON body (non-null after PATCH, null for new user)
- [ ] 1.6 GREEN — confirm `UserDto` projection includes `language`; update `AuthController.me()` mapping if needed
- [ ] 1.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-1.md + specs/user-language-preference/spec.md + design.md + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 2. Frontend: TranslationService + AuthService sync

### Contract
- **Spec**: "The system SHALL call `TranslationService.applyProfileLanguage(language)` after `AuthService.loadCurrentUser()` resolves." / "If `language` is non-null, the service SHALL apply that language and overwrite `localStorage('language')`." / "If `language` is null, the service SHALL read `localStorage('language')` and fire a fire-and-forget `PATCH /api/auth/me/language` to push the browser preference to the profile." / "The system SHALL fire a fire-and-forget `PATCH /api/auth/me/language` when `TranslationService.setLanguage()` is called while the user is authenticated." / "PATCH failures SHALL be silently ignored."
- **Runtime**: `cd frontend && npx ng test --no-watch --include='**/translation.service.spec.ts,**/auth.service.spec.ts'` → all new applyProfileLanguage and setLanguage-with-auth tests pass; no DI errors at runtime (`ng build` succeeds)
- **Code**: No circular DI — `AuthService` imports `TranslationService` (one-way). `setLanguage()` guards PATCH with an `isAuthFn: () => boolean` callback set via `init()` (passed from `AuthService` using `() => this.isAuthenticated()`). `applyProfileLanguage(lang)` is a new public method on `TranslationService`. `UserDto` interface gets `language?: 'en' | 'zh'`. Fire-and-forget: `this.http.patch(...).pipe(catchError(() => EMPTY)).subscribe()`.
- **Threshold**: 80

- [ ] 2.0 CONTRACT — write openspec/changes/locale-switch-refactor/contracts/group-2.md with the ### Contract block above; confirm all three fields (Spec, Runtime, Code) are non-empty before proceeding
- [ ] 2.1 RED — write failing test in `translation.service.spec.ts`: `applyProfileLanguage('zh')` applies zh and writes localStorage
- [ ] 2.2 GREEN — add `applyProfileLanguage(lang: 'en' | 'zh' | null)` to `TranslationService`; if non-null: call `setLanguage(lang)` (skipping PATCH); overwrite localStorage
- [ ] 2.3 RED — write failing test: `applyProfileLanguage(null)` reads localStorage and fires PATCH
- [ ] 2.4 GREEN — implement null-branch in `applyProfileLanguage`: read `localStorage.getItem('language')`, call PATCH fire-and-forget
- [ ] 2.5 RED — write failing test: `setLanguage('zh')` fires PATCH when `isAuthFn` returns true; does NOT fire when false
- [ ] 2.6 GREEN — add `isAuthFn: () => boolean` parameter to `TranslationService.init()`; update `setLanguage()` to call PATCH fire-and-forget when `isAuthFn()` is true; update `APP_INITIALIZER` in `app.config.ts` to pass `() => authService.isAuthenticated()`
- [ ] 2.7 RED — write failing test in `auth.service.spec.ts`: `loadCurrentUser()` calls `translationService.applyProfileLanguage` with the returned `user.language`
- [ ] 2.8 GREEN — inject `TranslationService` into `AuthService`; call `translationService.applyProfileLanguage(user.language ?? null)` after `currentUser.set(user)` in `loadCurrentUser()`
- [ ] 2.9 — update `UserDto` interface to add `language?: 'en' | 'zh'`
- [ ] 2.E EVAL — spawn evaluator subagent (haiku); reads contracts/group-2.md + specs/user-language-preference/spec.md + design.md + group diff; invokes superpowers:requesting-code-review (CRITICAL/HIGH = BLOCK); scores Spec/Runtime/Code; total ≥ 80 → PASS; < 80 → append FIX tasks + retry (max 3 attempts, plateau < 5pt = escalate)

## 3. Verification + ship

- [ ] 3.1 Run full backend test suite: `cd backend && ./mvnw test` — ensure no regressions
- [ ] 3.2 Run full frontend test suite: `cd frontend && npx ng test --no-watch` — ensure test count at or below baseline (14 failing pre-existing)
- [ ] 3.3 Run e2e suite if servers are up: `cd e2e && npx playwright test` — ensure no regressions in login flow
- [ ] 3.4 Run superpowers:verification-before-completion — confirm `ng build` succeeds with no DI cycle errors; confirm `./mvnw test` passes; check no hardcoded EN strings remain in changed components
