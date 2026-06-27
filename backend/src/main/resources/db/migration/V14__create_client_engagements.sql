CREATE TABLE client_engagements (
    id          BIGSERIAL    PRIMARY KEY,
    client_id   BIGINT       NOT NULL REFERENCES clients(id),
    tax_year    SMALLINT     NOT NULL,
    status      VARCHAR(30)  NOT NULL,
    updated_by  BIGINT       REFERENCES users(id),
    updated_at  TIMESTAMP    NOT NULL,
    UNIQUE (client_id, tax_year)
);

CREATE TABLE client_engagement_history (
    id            BIGSERIAL    PRIMARY KEY,
    engagement_id BIGINT       NOT NULL REFERENCES client_engagements(id) ON DELETE CASCADE,
    from_status   VARCHAR(30),
    to_status     VARCHAR(30)  NOT NULL,
    changed_by    BIGINT       NOT NULL REFERENCES users(id),
    changed_at    TIMESTAMP    NOT NULL,
    note          TEXT
);
