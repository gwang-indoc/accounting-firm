-- Clean slate: remove dependent rows first, then clients (acknowledged data loss per requirements)
DELETE FROM client_documents;
DELETE FROM clients;

-- Add admin_id: each client is owned by the admin who created it
ALTER TABLE clients ADD COLUMN admin_id BIGINT NOT NULL REFERENCES users(id);

-- Make clients.email required and globally unique
ALTER TABLE clients ALTER COLUMN email SET NOT NULL;
ALTER TABLE clients ADD CONSTRAINT clients_email_unique UNIQUE (email);

-- Backfill any users with null name using email prefix before adding NOT NULL constraint
UPDATE users SET name = split_part(email, '@', 1) WHERE name IS NULL;

-- Enforce users.name NOT NULL
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
