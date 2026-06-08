---
Date: 2026-06-08
Change: locale-switch-refactor
Requirements: requirements.md
---

## Why

Language preference is currently stored only in `localStorage`, so it resets whenever a user signs in on a new device or browser. Adding server-side persistence per user profile gives authenticated users a consistent locale across sessions and devices.

## What Changes

- Add `language` column (`VARCHAR(10) DEFAULT NULL`) to `users` table via Flyway V11 migration.
- Extend `User` entity and `UserDto` to include `language` field.
- Add `PATCH /api/auth/me/language` endpoint to update language preference for the authenticated user.
- `GET /api/auth/me` now returns `language` field in `UserDto`.
- `TranslationService.setLanguage()` fires a fire-and-forget `PATCH` to the backend when the user is authenticated.
- `AuthService.loadCurrentUser()` calls a new `TranslationService.applyProfileLanguage()` method after loading the user, applying profile language (if set) or pushing localStorage preference to profile (if profile has `null`).
- Full i18n coverage audit complete: all previously hardcoded EN strings in `login`, `login-email-code`, `client-portal-login`, `admin-clients`, `admin-client-documents`, and portal `documents` components are now wired to `| translate`. (Already shipped on this branch.)

## Capabilities

### New Capabilities

- `user-language-preference` — server-side language preference persistence: backend column + endpoint + frontend sync logic.

### Modified Capabilities

- `client-login-page` — `loadCurrentUser` now triggers language sync from profile; login page and email-code component strings fully translated.

## Impact

- **Backend**: `User.java`, `UserDto.java`, `AuthController.java`, new `V11__add_language_to_users.sql`.
- **Frontend**: `TranslationService`, `AuthService`, `UserDto` interface, `login.component`, `login-email-code.component`, `client-portal-login.component`, `admin-clients.component`, `admin-client-documents.component`, portal `documents.component`.
- **Translation JSON**: `public/en.json`, `public/zh.json`, `admin/en.json`, `admin/zh.json`, `portal/en.json`, `portal/zh.json` (new keys added).
- **No new npm packages.**

## Out of Scope

- Browser `Accept-Language` detection (deferred).
- Cookie-based language storage (not needed).
- RTL layout or locale-specific date/number formatting (deferred).
- Fixing the pre-existing test failures unrelated to this change (separate cleanup).
