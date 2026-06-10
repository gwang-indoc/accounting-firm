### Contract

- **Spec**: REMOVED `email-password-auth` — "Users can log in with email and password" (`POST /api/auth/login` removed). REMOVED `client-registration` — "New users can register with email and password" (`POST /api/auth/register` removed). // A separate new Flyway migration SHALL drop the `users.password_hash` column. No code path SHALL read `password_hash` after this change.
- **Runtime**: `cd backend && ./mvnw test` → expected: full suite green after removal; `POST /api/auth/register` and `POST /api/auth/login` no longer mapped (404); app boots with V10 applied; no compile/reference to `password_hash` remains.
- **Code**: D6 — delete `register`/`login` handlers, `AuthService.register/login`, `RegisterRequest`/`LoginRequest` DTOs and their tests; remove `passwordHash` field from `User` entity. D7 — `V10__drop_password_hash.sql` = `ALTER TABLE users DROP COLUMN password_hash;`. Existing users keep `email` → log in via code (no data loss).
- **Threshold**: 80
