ALTER TABLE clients
    ADD COLUMN business_type         VARCHAR(20)  NOT NULL DEFAULT 'PERSONAL',
    ADD COLUMN fiscal_year_end_month SMALLINT     NOT NULL DEFAULT 12,
    ADD COLUMN fiscal_year_end_day   SMALLINT     NOT NULL DEFAULT 31;
