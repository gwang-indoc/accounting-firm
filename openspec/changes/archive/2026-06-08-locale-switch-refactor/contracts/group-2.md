# Contract — Group 2: Frontend TranslationService + AuthService sync

## Spec

- The system SHALL call `TranslationService.applyProfileLanguage(language)` after `AuthService.loadCurrentUser()` resolves.
- If `language` is non-null, the service SHALL apply that language and overwrite `localStorage('language')`.
- If `language` is null, the service SHALL read `localStorage('language')` and fire a fire-and-forget `PATCH /api/auth/me/language` to push the browser preference to the profile.
- The system SHALL fire a fire-and-forget `PATCH /api/auth/me/language` when `TranslationService.setLanguage()` is called while the user is authenticated.
- PATCH failures SHALL be silently ignored.

## Runtime

Command: `cd frontend && npx ng test --no-watch --include='**/translation.service.spec.ts,**/auth.service.spec.ts'`

Expected: All new `applyProfileLanguage` and `setLanguage`-with-auth tests pass; no DI errors at runtime (`ng build` succeeds).

## Code

- No circular DI — `AuthService` imports `TranslationService` (one-way). `TranslationService` does NOT import `AuthService`.
- `setLanguage()` guards PATCH with an `isAuthFn: () => boolean` callback set via `init(isAuthFn)`, passed from `app.config.ts` as `() => authService.isAuthenticated()`.
- `applyProfileLanguage(lang: 'en' | 'zh' | null)` is a new public method on `TranslationService`.
- `UserDto` interface gets `language?: 'en' | 'zh'`.
- Fire-and-forget pattern: `this.http.patch(...).pipe(catchError(() => EMPTY)).subscribe()`.

## Threshold

80
