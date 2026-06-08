# Contract — Group 1: Backend language column + UserDto + PATCH endpoint

## Spec

- The system SHALL store the authenticated user's language preference (`'en'` or `'zh'`) in the `users.language` column (nullable VARCHAR(10)).
- The `GET /api/auth/me` endpoint SHALL include the `language` field in its `UserDto` response.
- A `PATCH /api/auth/me/language` endpoint SHALL accept `{"language": "en" | "zh"}` and update the column for the authenticated principal, returning 204 No Content.
- WHEN an unauthenticated request is made to `PATCH /api/auth/me/language` THEN the server responds with 401 Unauthorized.

## Runtime

Command: `cd backend && ./mvnw test -Dtest=AuthControllerTest`

Expected: All PATCH /api/auth/me/language tests pass — authenticated update → 204, unauthenticated → 401, GET /api/auth/me includes language field.

## Code

- V11 migration: `ALTER TABLE users ADD COLUMN language VARCHAR(10) DEFAULT NULL;` — nullable, no backfill.
- `UserDto` is a Java record: add `language` as the last field (`String language`).
- PATCH endpoint uses `@AuthenticationPrincipal User user` — same pattern as existing `/me`.
- No separate repository method needed: use existing `UserRepository.save()`.

## Threshold

80
