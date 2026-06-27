ALTER TABLE client_engagements DROP CONSTRAINT client_engagements_client_id_tax_year_key;
ALTER TABLE client_engagements ADD COLUMN name VARCHAR(255) NOT NULL DEFAULT '';
ALTER TABLE client_engagements ADD COLUMN note TEXT;
ALTER TABLE client_engagements ALTER COLUMN name DROP DEFAULT;
ALTER TABLE client_engagements ADD CONSTRAINT uq_client_engagements_client_year_name
    UNIQUE (client_id, tax_year, name);
