# Lessons: Locale Switch Refactor

**Archived:** 2026-06-08
**Change directory:** `openspec/changes/archive/2026-06-08-locale-switch-refactor/`

## Surprises / things to anticipate next time

- **`applyProfileLanguage` must `await` async inner calls.** The first eval pass found that `loadLanguage()` was being called without `await`, so the method returned before the language was actually applied. Any method that calls `async` helpers must propagate the `await` chain — a missing `await` doesn't fail loudly, it just silently races.

- **APP_INITIALIZER race when two initializers share state.** When `initTranslation` and `initAuth` run as separate `APP_INITIALIZER` entries, Angular runs them in parallel. If `loadCurrentUser()` needs to call `applyProfileLanguage()` (which depends on `isAuthFn` being set by `initTranslation`), the two initializers race. Fix: combine them into ONE `initApp` function that does `await Promise.all([init(), loadCurrentUser()])` then sequentially calls `applyProfileLanguage()` after both resolve.

- **`AuthService → TranslationService` DI cascades to 15 test files.** Adding `TranslationService` as a constructor dependency of `AuthService` broke every component test that provided `AuthService` as a real class — they all transitively needed `TranslateService` which wasn't in their TestBed. The direction must be one-way, decoupled via a callback (`isAuthFn: () => boolean`). The general pattern: services that affect app-wide state (translation, theme) should not inject services that depend on HTTP (auth) — use callback injection instead.

- **`HttpTestingController.verify()` fails if you spy on HTTP methods in `init()`.** When `loadAndMergeLanguage` is called in `init()`, it makes real HTTP calls. Adding `HttpTestingController` to the test module causes `verify()` to fail unless those calls are either flushed or mocked. Easiest fix: `vi.spyOn(service as any, 'loadAndMergeLanguage').mockResolvedValue({})` in `beforeEach` so no HTTP escapes into the controller.

## TDD observations

- Group 2 needed two evaluator passes. All three CRITICAL failures were in the async/await chain and DI wiring — areas where the code compiles cleanly but behaves incorrectly at runtime. Write tests that assert the *effect* (signal value, localStorage, PATCH fired), not just that the method was called.
