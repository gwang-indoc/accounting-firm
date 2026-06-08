### Contract

- **Spec**: `clients.email` SHALL be NOT NULL and globally UNIQUE across all client records. Every client record SHALL have a non-null `admin_id` referencing the `users` table. The database SHALL reject inserts without `admin_id` (NOT NULL violation). The database SHALL reject two client records sharing the same email (UNIQUE violation). After migration, no row in `users` SHALL have a null `name`.
- **Runtime**: `cd backend && ./mvnw test -Dtest=ClientRepositoryTest,UserRepositoryTest` → expected: all constraint tests pass; migration applies cleanly on a fresh schema
- **Code**: Single migration file `V12__add_client_admin_ownership.sql`; order is: DELETE clients, ADD admin_id NOT NULL, ALTER email NOT NULL + UNIQUE, backfill users.name, ALTER users.name NOT NULL. No rollback path — roll forward only.
- **Threshold**: 80
