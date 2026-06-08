## ADDED Requirements

### Requirement: Language preference persists to user profile on backend
The system SHALL store the authenticated user's language preference (`'en'` or `'zh'`) in the `users.language` column (nullable VARCHAR(10)). The `GET /api/auth/me` endpoint SHALL include the `language` field in its `UserDto` response. A `PATCH /api/auth/me/language` endpoint SHALL accept `{"language": "en" | "zh"}` and update the column for the authenticated principal, returning 204 No Content.

#### Scenario: Authenticated user updates language
- **WHEN** an authenticated user calls `PATCH /api/auth/me/language` with `{"language": "zh"}`
- **THEN** the server responds with 204 No Content
- **THEN** a subsequent `GET /api/auth/me` returns `{"language": "zh"}` in the response body

#### Scenario: Language field included in me response
- **WHEN** an authenticated user calls `GET /api/auth/me`
- **THEN** the response body includes a `language` field (value is `"en"`, `"zh"`, or `null`)

#### Scenario: Unauthenticated PATCH is rejected
- **WHEN** an unauthenticated request is made to `PATCH /api/auth/me/language`
- **THEN** the server responds with 401 Unauthorized

### Requirement: Frontend syncs language preference on login
The system SHALL call `TranslationService.applyProfileLanguage(language)` after `AuthService.loadCurrentUser()` resolves. If `language` is non-null, the service SHALL apply that language and overwrite `localStorage('language')`. If `language` is null, the service SHALL read `localStorage('language')` and fire a fire-and-forget `PATCH /api/auth/me/language` to push the browser preference to the profile.

#### Scenario: Profile language applied on login
- **WHEN** a user logs in and their profile has `language = 'zh'`
- **THEN** the UI switches to Chinese immediately after login completes
- **THEN** `localStorage.getItem('language')` equals `'zh'`

#### Scenario: Browser preference pushed to profile on first login
- **WHEN** a user logs in and their profile has `language = null`
- **THEN** the localStorage value (e.g., `'zh'`) is pushed to the profile via PATCH
- **THEN** the UI remains on `'zh'`

#### Scenario: Profile wins over localStorage on conflict
- **WHEN** a user logs in and their profile has `language = 'en'` but `localStorage('language') = 'zh'`
- **THEN** the UI switches to `'en'`
- **THEN** `localStorage.getItem('language')` is updated to `'en'`

### Requirement: Language switch persists to profile for authenticated users
The system SHALL fire a fire-and-forget `PATCH /api/auth/me/language` when `TranslationService.setLanguage()` is called while the user is authenticated. The PATCH SHALL be non-blocking — the UI language switches immediately regardless of the request outcome. PATCH failures SHALL be silently ignored.

#### Scenario: Language switch while authenticated
- **WHEN** an authenticated user toggles the language from EN to ZH
- **THEN** the UI switches to Chinese immediately
- **THEN** a PATCH request is sent to `/api/auth/me/language` with `{"language": "zh"}`
- **THEN** on page reload, the profile language `'zh'` is applied

#### Scenario: Language switch while anonymous
- **WHEN** an anonymous user toggles the language from EN to ZH
- **THEN** the UI switches to Chinese immediately
- **THEN** `localStorage.getItem('language')` equals `'zh'`
- **THEN** no PATCH request is made to the backend
